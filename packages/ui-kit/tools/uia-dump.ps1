# What a screen reader sees in a window: the UI Automation tree (control type, name, patterns, bounds), as JSON, through
# the same client API Narrator and Inspect use. It reads only; -Invoke presses one element by name through UIA's Invoke
# (or SelectionItem.Select for a tab), the way a screen reader would. Never brings the window forward.
#   pwsh -File native/tools/uia-dump.ps1 -ProcessId 1234 [-Depth 8] [-Invoke "Store"]
param([Parameter(Mandatory)][int]$ProcessId, [int]$Depth = 8, [string]$Invoke = '')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$p = Get-Process -Id $ProcessId
if ($p.MainWindowHandle -eq 0) { throw "process $ProcessId has no window" }
$A = [System.Windows.Automation.AutomationElement]
$root = $A::FromHandle($p.MainWindowHandle)
$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
$out = [System.Collections.Generic.List[object]]::new()
function Dump($el, $d) {
  if ($d -gt $Depth) { return }
  $c = $el.Current
  $r = $c.BoundingRectangle
  $out.Add([ordered]@{
      depth = $d; type = $c.ControlType.ProgrammaticName.Replace('ControlType.', ''); name = $c.Name
      patterns = @($el.GetSupportedPatterns() | ForEach-Object { $_.ProgrammaticName -replace 'PatternIdentifiers.Pattern', '' })
      rect = @([int]$r.X, [int]$r.Y, [int]$r.Width, [int]$r.Height); enabled = $c.IsEnabled; offscreen = $c.IsOffscreen
      focusable = $c.IsKeyboardFocusable; focused = $c.HasKeyboardFocus
      live = $(try { [int]$el.GetCurrentPropertyValue([System.Windows.Automation.AutomationElement]::LiveSettingProperty) } catch { $null })
    })
  $k = $walker.GetFirstChild($el)
  while ($null -ne $k) { Dump $k ($d + 1); $k = $walker.GetNextSibling($k) }
}
# The first question activates the provider; its first full tree follows the next frame.
$null = $root.Current.Name
Start-Sleep -Milliseconds 400
Dump $root 0
$invoked = $null
if ($Invoke) {
  $cond = New-Object System.Windows.Automation.PropertyCondition ($A::NameProperty), $Invoke
  $e = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
  if (-not $e) { $invoked = "not found: $Invoke" }
  else {
    $pat = $null
    if ($e.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pat)) { $pat.Invoke(); $invoked = "invoked" }
    elseif ($e.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$pat)) { $pat.Select(); $invoked = "selected" }
    else { $invoked = "no Invoke or SelectionItem on $Invoke" }
  }
}
[ordered]@{ nodes = $out; invoked = $invoked } | ConvertTo-Json -Depth 6 -Compress
