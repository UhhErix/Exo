# A picture of a test window, from outside Exo (AGENTS.md keeps capture out of Exo itself): PrintWindow with
# PW_RENDERFULLCONTENT on exo-ui's own window, found by its process. It reads the window's pixels even when another
# window covers it, and activates nothing.
#   pwsh -File capture.ps1 -ProcessId <exo-ui pid> -Out shot.png
param([Parameter(Mandatory)][int]$ProcessId, [Parameter(Mandatory)][string]$Out)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class ExoCapture {
    public delegate bool EnumProc(IntPtr hwnd, IntPtr l);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    public static IntPtr Find(uint want) {
        IntPtr found = IntPtr.Zero;
        EnumWindows((h, l) => { uint pid; GetWindowThreadProcessId(h, out pid); if (pid == want && IsWindowVisible(h)) { found = h; return false; } return true; }, IntPtr.Zero);
        return found;
    }
}
'@
$hwnd = [ExoCapture]::Find([uint32]$ProcessId)
if ($hwnd -eq [IntPtr]::Zero) { throw "no visible window for process $ProcessId" }
$r = New-Object ExoCapture+RECT
[void][ExoCapture]::GetClientRect($hwnd, [ref]$r)
$bmp = New-Object System.Drawing.Bitmap ($r.Right - $r.Left), ($r.Bottom - $r.Top)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$dc = $g.GetHdc()
# PW_CLIENTONLY (1) | PW_RENDERFULLCONTENT (2): DirectX content included.
[void][ExoCapture]::PrintWindow($hwnd, $dc, 3)
$g.ReleaseHdc($dc)
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
$Out
