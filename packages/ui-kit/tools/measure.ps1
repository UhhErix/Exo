# Idle CPU, memory and GPU memory of a running exo-ui and its host, read from outside (nothing is driven). Run tools/test-instance.ps1
# first, and leave the machine alone. CPU is per cent of one core over -Seconds, from process times.
param([int]$Seconds = 30, [string[]]$Names = @('exo-ui', 'ExoLauncher'))
$all = Get-Process -Name $Names -ErrorAction SilentlyContinue
if (-not $all) { throw 'Nothing to measure.' }
$before = @{}; foreach ($p in $all) { $before[$p.Id] = $p.TotalProcessorTime.TotalMilliseconds }
Start-Sleep -Seconds $Seconds
foreach ($p in $all) {
    $p.Refresh()
    $cpu = ($p.TotalProcessorTime.TotalMilliseconds - $before[$p.Id]) / ($Seconds * 10)
    $gpu = 0
    try {
        $gpu = (Get-Counter "\GPU Process Memory(pid_$($p.Id)_*)\Dedicated Usage" -ErrorAction Stop).CounterSamples | Measure-Object CookedValue -Sum | ForEach-Object { $_.Sum / 1MB }
    } catch { }
    '{0,-12} pid {1,-6} cpu {2,6:N2}%  working set {3,5:N0} MB  private {4,5:N0} MB  gpu {5,5:N0} MB  threads {6}' -f $p.ProcessName, $p.Id, $cpu, ($p.WorkingSet64 / 1MB), ($p.PrivateMemorySize64 / 1MB), $gpu, $p.Threads.Count
}
