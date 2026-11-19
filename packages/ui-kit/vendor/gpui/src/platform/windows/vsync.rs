use std::{
    sync::{Condvar, LazyLock, Mutex},
    time::{Duration, Instant},
};

use anyhow::{Context, Result};
use util::ResultExt;
use windows::Win32::{
    Foundation::HWND,
    Graphics::Dwm::{DWM_TIMING_INFO, DwmFlush, DwmGetCompositionTimingInfo},
    System::Performance::QueryPerformanceFrequency,
};

static QPC_TICKS_PER_SECOND: LazyLock<u64> = LazyLock::new(|| {
    let mut frequency = 0;
    // On systems that run Windows XP or later, the function will always succeed and
    // will thus never return zero.
    unsafe { QueryPerformanceFrequency(&mut frequency).unwrap() };
    frequency as u64
});

const VSYNC_INTERVAL_THRESHOLD: Duration = Duration::from_millis(1);
const DEFAULT_VSYNC_INTERVAL: Duration = Duration::from_micros(16_666); // ~60Hz

pub(crate) struct VSyncProvider {
    interval: Duration,
    f: Box<dyn Fn() -> bool>,
}

impl VSyncProvider {
    pub(crate) fn new() -> Self {
        let interval = get_dwm_interval()
            .context("Failed to get DWM interval")
            .log_err()
            .unwrap_or(DEFAULT_VSYNC_INTERVAL);
        let f = Box::new(|| unsafe { DwmFlush().is_ok() });
        Self { interval, f }
    }

    pub(crate) fn wait_for_vsync(&self) {
        let vsync_start = Instant::now();
        let wait_succeeded = (self.f)();
        let elapsed = vsync_start.elapsed();
        // DwmFlush and DCompositionWaitForCompositorClock returns very early
        // instead of waiting until vblank when the monitor goes to sleep or is
        // unplugged (nothing to present due to desktop occlusion). We use 1ms as
        // a threshold for the duration of the wait functions and fallback to
        // Sleep() if it returns before that. This could happen during normal
        // operation for the first call after the vsync thread becomes non-idle,
        // but it shouldn't happen often.
        if !wait_succeeded || elapsed < VSYNC_INTERVAL_THRESHOLD {
            log::trace!("VSyncProvider::wait_for_vsync() took less time than expected");
            std::thread::sleep(self.interval);
        }
    }
}

fn get_dwm_interval() -> Result<Duration> {
    let mut timing_info = DWM_TIMING_INFO {
        cbSize: std::mem::size_of::<DWM_TIMING_INFO>() as u32,
        ..Default::default()
    };
    unsafe { DwmGetCompositionTimingInfo(HWND::default(), &mut timing_info) }?;
    let interval = retrieve_duration(timing_info.qpcRefreshPeriod, *QPC_TICKS_PER_SECOND);
    // Check for interval values that are impossibly low. A 29 microsecond
    // interval was seen (from a qpcRefreshPeriod of 60).
    if interval < VSYNC_INTERVAL_THRESHOLD {
        Ok(retrieve_duration(
            timing_info.rateRefresh.uiDenominator as u64,
            timing_info.rateRefresh.uiNumerator as u64,
        ))
    } else {
        Ok(interval)
    }
}

#[inline]
fn retrieve_duration(counts: u64, ticks_per_second: u64) -> Duration {
    let ticks_per_microsecond = ticks_per_second / 1_000_000;
    Duration::from_micros(counts / ticks_per_microsecond)
}

// ---- Exo's patch: frames on demand ------------------------------------------------------------------------------------------------
//
// The vsync thread above wakes the main thread once per vsync for ever (`RedrawWindow` on every window), which costs a steady 1 to 2 % of a
// core in a window that draws nothing. A window only needs vsync ticks while something may be drawn: it is dirty (`Invalidator::set_dirty`)
// or an animation asked for the next frame (`Window::on_next_frame`). `demand_frames` says so, and the thread sleeps on a condition
// variable, with no timer, until it is said again; it then keeps ticking for `LINGER` after the last demand (the display stays at its
// full refresh rate for a moment after input, as `needs_present` in window.rs intends). See vendor/gpui/PATCHES.md.

const LINGER: Duration = Duration::from_millis(1000);

struct Demand {
    until: Mutex<Option<Instant>>,
    wake: Condvar,
}

static DEMAND: Demand = Demand { until: Mutex::new(None), wake: Condvar::new() };

/// Something may need drawing: keep the vsync thread running for the next second.
pub(crate) fn demand_frames() {
    let mut until = DEMAND.until.lock().unwrap();
    let asleep = until.is_none_or(|t| t <= Instant::now());
    *until = Some(Instant::now() + LINGER);
    if asleep {
        DEMAND.wake.notify_all();
    }
}

/// The vsync thread's gate: returns at once while frames are wanted, else sleeps until they are.
pub(crate) fn wait_for_demand() {
    let mut until = DEMAND.until.lock().unwrap();
    loop {
        match *until {
            Some(t) if t > Instant::now() => return,
            _ => {
                *until = None;
                until = DEMAND.wake.wait(until).unwrap();
            }
        }
    }
}
