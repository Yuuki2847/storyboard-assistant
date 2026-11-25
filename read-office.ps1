param([string]$Path, [string]$Extension)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$app = $null
$file = $null
try {
    if ($Extension -in '.doc', '.docx') {
        $app = New-Object -ComObject Word.Application
        $app.AutomationSecurity = 3
        $app.DisplayAlerts = 0
        $app.Options.UpdateLinksAtOpen = $false
        $file = $app.Documents.Open($Path, $false, $true, $false)
        [Console]::Write($file.Content.Text.Replace([char]13, [char]10).Replace([char]7, [char]9))
    } else {
        $app = New-Object -ComObject Excel.Application
        $app.AutomationSecurity = 3
        $app.DisplayAlerts = $false
        $file = $app.Workbooks.Open($Path, 0, $true)
        foreach ($sheet in $file.Worksheets) {
            [Console]::WriteLine("[$($sheet.Name)]")
            $values = $sheet.UsedRange.Value2
            if ($values -isnot [Array]) {
                [Console]::WriteLine([string]$values)
                continue
            }
            for ($row = $values.GetLowerBound(0); $row -le $values.GetUpperBound(0); $row++) {
                $cells = for ($col = $values.GetLowerBound(1); $col -le $values.GetUpperBound(1); $col++) {
                    [string]$values[$row, $col]
                }
                $line = ($cells -join "`t").TrimEnd("`t")
                if ($line.Trim()) { [Console]::WriteLine($line) }
            }
        }
    }
} finally {
    try {
        if ($file) {
            if ($Extension -in '.doc', '.docx') { $file.Close(0) }
            else { $file.Close($false) }
        }
    } finally {
        if ($app) { $app.Quit() }
    }
}
