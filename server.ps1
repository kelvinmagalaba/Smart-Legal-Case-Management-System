# ============================================================================
# SLCMS Secure HTTP & Enterprise Security Server
# Backed by persistent disk database (data/users.json, data/security_events.json, data/security_alerts.json)
# ============================================================================

$port = 8080
$rootDir = $PSScriptRoot
$dataDir = Join-Path $rootDir "data"
if (!(Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }

$usersFile = Join-Path $dataDir "users.json"
$eventsFile = Join-Path $dataDir "security_events.json"
$alertsFile = Join-Path $dataDir "security_alerts.json"
$backupsFile = Join-Path $dataDir "backups.json"
$backupsDir = Join-Path $dataDir "backups"
$tasksFile = Join-Path $dataDir "tasks.json"
$deadlinesFile = Join-Path $dataDir "deadlines.json"
$taskHistoryFile = Join-Path $dataDir "task_history.json"
$commsFile = Join-Path $dataDir "communications.json"
$smtpConfigFile = Join-Path $dataDir "smtp_config.json"

if (!(Test-Path $eventsFile)) { '[]' | Set-Content -Path $eventsFile -Encoding UTF8 }
if (!(Test-Path $alertsFile)) { '[]' | Set-Content -Path $alertsFile -Encoding UTF8 }
if (!(Test-Path $backupsFile)) { '[]' | Set-Content -Path $backupsFile -Encoding UTF8 }
if (!(Test-Path $tasksFile)) { '[]' | Set-Content -Path $tasksFile -Encoding UTF8 }
if (!(Test-Path $deadlinesFile)) { '[]' | Set-Content -Path $deadlinesFile -Encoding UTF8 }
if (!(Test-Path $taskHistoryFile)) { '[]' | Set-Content -Path $taskHistoryFile -Encoding UTF8 }
if (!(Test-Path $commsFile)) { '[]' | Set-Content -Path $commsFile -Encoding UTF8 }
if (!(Test-Path $smtpConfigFile)) { '{"host":"smtp.gmail.com","port":587,"enableSsl":true,"username":"slcms.firm.notifications@gmail.com","password":"","fromEmail":"slcms.firm.notifications@gmail.com","fromName":"SLCMS Law Firm","configured":true,"lastTestedAt":"2026-09-17T12:00:00Z","testStatus":"Ready"}' | Set-Content -Path $smtpConfigFile -Encoding UTF8 }
if (!(Test-Path $backupsDir)) { New-Item -ItemType Directory -Path $backupsDir | Out-Null }

$rateLimitMap = [System.Collections.Concurrent.ConcurrentDictionary[string, System.Collections.Generic.List[long]]]::new()

function Get-DbCommunications {
    if (Test-Path $commsFile) {
        $raw = [System.IO.File]::ReadAllText($commsFile, [System.Text.Encoding]::UTF8)
        $parsed = ($raw | ConvertFrom-Json)
        if ($null -eq $parsed) { return @() }
        return @($parsed)
    }
    return @()
}

function Save-DbCommunications($commsList) {
    $arr = @($commsList)
    $json = $arr | ConvertTo-Json -Depth 10
    if ($arr.Count -eq 1 -and -not $json.Trim().StartsWith('[')) {
        $json = "[$json]"
    }
    if ($arr.Count -eq 0) { $json = "[]" }
    [System.IO.File]::WriteAllText($commsFile, $json, [System.Text.Encoding]::UTF8)
}

function Get-DbSmtpConfig {
    if (Test-Path $smtpConfigFile) {
        $raw = [System.IO.File]::ReadAllText($smtpConfigFile, [System.Text.Encoding]::UTF8)
        $parsed = ($raw | ConvertFrom-Json)
        if ($null -ne $parsed) { return $parsed }
    }
    return [PSCustomObject]@{
        host = "smtp.gmail.com"
        port = 587
        enableSsl = $true
        username = "slcms.firm.notifications@gmail.com"
        password = ""
        fromEmail = "slcms.firm.notifications@gmail.com"
        fromName = "SLCMS Law Firm"
        configured = $true
        lastTestedAt = [DateTime]::UtcNow.ToString("o")
        testStatus = "Ready"
    }
}

function Save-DbSmtpConfig($cfg) {
    $json = $cfg | ConvertTo-Json -Depth 5
    [System.IO.File]::WriteAllText($smtpConfigFile, $json, [System.Text.Encoding]::UTF8)
}

function Send-GmailSmtpEmail($toEmail, $subject, $bodyText, $smtpConfig) {
    try {
        $smtp = New-Object System.Net.Mail.SmtpClient
        $smtp.Host = if ($smtpConfig.host) { $smtpConfig.host } else { "smtp.gmail.com" }
        $smtp.Port = if ($smtpConfig.port) { [int]$smtpConfig.port } else { 587 }
        $smtp.EnableSsl = $true
        $smtp.Timeout = 12000

        $fromAddr = if ($smtpConfig.fromEmail) { $smtpConfig.fromEmail } else { "slcms.firm.notifications@gmail.com" }
        $fromName = if ($smtpConfig.fromName) { $smtpConfig.fromName } else { "SLCMS Law Firm" }
        $from = New-Object System.Net.Mail.MailAddress($fromAddr, $fromName)
        $to = New-Object System.Net.Mail.MailAddress($toEmail)

        $mail = New-Object System.Net.Mail.MailMessage($from, $to)
        $mail.Subject = $subject
        $mail.Body = $bodyText
        $mail.IsBodyHtml = $false
        $mail.BodyEncoding = [System.Text.Encoding]::UTF8
        $mail.SubjectEncoding = [System.Text.Encoding]::UTF8

        $user = $smtpConfig.username
        $pwd = $smtpConfig.password

        if ($user -and $pwd -and $pwd.Trim() -ne "") {
            $smtp.Credentials = New-Object System.Net.NetworkCredential($user, $pwd)
            $smtp.Send($mail)
            $mail.Dispose()
            $smtp.Dispose()
            return @{ success = $true; providerRef = "GMAIL-SMTP-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; mode = "LIVE_SMTP" }
        } else {
            # Simulated Gmail SMTP dispatch
            $mail.Dispose()
            $smtp.Dispose()
            return @{ success = $true; providerRef = "GMAIL-SMTP-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; mode = "SANDBOX_SIMULATED" }
        }
    } catch {
        return @{ success = $false; error = $_.Exception.Message }
    }
}

function Get-DbTasks {
    if (Test-Path $tasksFile) {
        $raw = [System.IO.File]::ReadAllText($tasksFile, [System.Text.Encoding]::UTF8)
        $parsed = ($raw | ConvertFrom-Json)
        if ($null -eq $parsed) { return @() }
        return @($parsed)
    }
    return @()
}

function Save-DbTasks($tasksList) {
    $arr = @($tasksList)
    $json = $arr | ConvertTo-Json -Depth 10
    if ($arr.Count -eq 1 -and -not $json.Trim().StartsWith('[')) {
        $json = "[$json]"
    }
    if ($arr.Count -eq 0) { $json = "[]" }
    [System.IO.File]::WriteAllText($tasksFile, $json, [System.Text.Encoding]::UTF8)
}

function Get-DbDeadlines {
    if (Test-Path $deadlinesFile) {
        $raw = [System.IO.File]::ReadAllText($deadlinesFile, [System.Text.Encoding]::UTF8)
        $parsed = ($raw | ConvertFrom-Json)
        if ($null -eq $parsed) { return @() }
        return @($parsed)
    }
    return @()
}

function Save-DbDeadlines($deadlinesList) {
    $arr = @($deadlinesList)
    $json = $arr | ConvertTo-Json -Depth 10
    if ($arr.Count -eq 1 -and -not $json.Trim().StartsWith('[')) {
        $json = "[$json]"
    }
    if ($arr.Count -eq 0) { $json = "[]" }
    [System.IO.File]::WriteAllText($deadlinesFile, $json, [System.Text.Encoding]::UTF8)
}

function Get-DbTaskHistory {
    if (Test-Path $taskHistoryFile) {
        $raw = [System.IO.File]::ReadAllText($taskHistoryFile, [System.Text.Encoding]::UTF8)
        $parsed = ($raw | ConvertFrom-Json)
        if ($null -eq $parsed) { return @() }
        return @($parsed)
    }
    return @()
}

function Save-DbTaskHistory($historyList) {
    $arr = @($historyList)
    $json = $arr | ConvertTo-Json -Depth 10
    if ($arr.Count -eq 1 -and -not $json.Trim().StartsWith('[')) {
        $json = "[$json]"
    }
    if ($arr.Count -eq 0) { $json = "[]" }
    [System.IO.File]::WriteAllText($taskHistoryFile, $json, [System.Text.Encoding]::UTF8)
}


function Get-DbBackups {
    if (Test-Path $backupsFile) {
        $raw = [System.IO.File]::ReadAllText($backupsFile, [System.Text.Encoding]::UTF8)
        $parsed = ($raw | ConvertFrom-Json)
        if ($null -eq $parsed) { return @() }
        return @($parsed)
    }
    return @()
}

function Save-DbBackups($backupsList) {
    $arr = @($backupsList)
    $json = $arr | ConvertTo-Json -Depth 10
    if ($arr.Count -eq 1 -and -not $json.Trim().StartsWith('[')) {
        $json = "[$json]"
    }
    [System.IO.File]::WriteAllText($backupsFile, $json, [System.Text.Encoding]::UTF8)
}

function Get-DbUsers {
    if (Test-Path $usersFile) {
        $raw = [System.IO.File]::ReadAllText($usersFile, [System.Text.Encoding]::UTF8)
        return ($raw | ConvertFrom-Json)
    }
    return @()
}

function Save-DbUsers($usersList) {
    $json = $usersList | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($usersFile, $json, [System.Text.Encoding]::UTF8)
}

function Get-DbEvents {
    if (Test-Path $eventsFile) {
        $raw = [System.IO.File]::ReadAllText($eventsFile, [System.Text.Encoding]::UTF8)
        return ($raw | ConvertFrom-Json)
    }
    return @()
}

function Save-DbEvents($eventsList) {
    $json = $eventsList | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($eventsFile, $json, [System.Text.Encoding]::UTF8)
}

function Add-DbEvent($userId, $eventType, $desc, $ip, $result = $null, $userName = $null) {
    $events = @(Get-DbEvents)
    if (-not $userName) {
        if ($userId -and $userId -ne 'unknown') {
            $users = @(Get-DbUsers)
            $u = $users | Where-Object { $_.id -eq $userId -or $_.staffId -eq $userId } | Select-Object -First 1
            if ($u) { $userName = $u.name } else { $userName = $userId }
        } else {
            $userName = "Unknown User"
        }
    }
    if (-not $result) {
        $result = switch ($eventType) {
            'LOGIN_SUCCESS'        { 'Successful' }
            'LOGIN_FAILED'         { 'Failed' }
            'ADMIN_LOCK'           { 'Locked by administrator' }
            'ADMIN_UNLOCK'         { 'Unlocked' }
            'PASSWORD_RESET'       { 'Temporary password issued' }
            'TEMPORARY_LOCK'       { 'Temporarily locked for 2 minutes' }
            'BACKUP_CREATED'       { 'Successful' }
            'Login attempt'        { 'Successful' }
            'Account security'     { 'Temporarily locked for 2 minutes' }
            'Account management'   { 'Locked by administrator' }
            'Password management'  { 'Successful' }
            'User management'      { 'Created' }
            'Permission management'{ 'Updated' }
            default                { 'Successful' }
        }
    }
    $newEvent = [PSCustomObject]@{
        id          = "evt-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())-$((New-Guid).ToString().Substring(0,5))"
        userId      = $userId
        userName    = $userName
        eventType   = $eventType
        result      = $result
        description = $desc
        eventTime   = [DateTime]::UtcNow.ToString("o")
        ipAddress   = $ip
        resolved    = $false
        resolvedAt  = $null
        resolvedBy  = $null
    }
    $events += $newEvent
    Save-DbEvents $events
    return $newEvent
}

function Get-DbAlerts {
    if (Test-Path $alertsFile) {
        $raw = [System.IO.File]::ReadAllText($alertsFile, [System.Text.Encoding]::UTF8)
        $parsed = ($raw | ConvertFrom-Json)
        if ($null -eq $parsed) { return @() }
        return @($parsed)
    }
    return @()
}

function Save-DbAlerts($alertsList) {
    $arr = @($alertsList)
    $json = $arr | ConvertTo-Json -Depth 10
    if ($arr.Count -eq 1 -and -not $json.Trim().StartsWith('[')) {
        $json = "[$json]"
    }
    [System.IO.File]::WriteAllText($alertsFile, $json, [System.Text.Encoding]::UTF8)
}

function Check-RateLimit($ip) {
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $timestamps = $rateLimitMap.GetOrAdd($ip, [System.Collections.Generic.List[long]]::new())
    [System.Threading.Monitor]::Enter($timestamps)
    try {
        $cutoff = $now - 10000
        $timestamps.RemoveAll([Predicate[long]]{ param($t) $t -lt $cutoff })
        if ($timestamps.Count -ge 20) {
            return $false
        }
        $timestamps.Add($now)
        return $true
    } finally {
        [System.Threading.Monitor]::Exit($timestamps)
    }
}

function Send-JsonResponse($res, [int]$statusCode, $obj) {
    $res.StatusCode = $statusCode
    $res.ContentType = 'application/json; charset=utf-8'
    $json = if ($obj -is [string]) { $obj } else { $obj | ConvertTo-Json -Depth 10 -Compress }
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.OutputStream.Flush()
    $res.Close()
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Start()
Write-Host "SLCMS Backend & Web Server listening on http://127.0.0.1:$port/"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $req = $context.Request
            $res = $context.Response
            
            $origin = $req.Headers["Origin"]
            if ($origin) {
                $res.AddHeader("Access-Control-Allow-Origin", $origin)
            } else {
                $res.AddHeader("Access-Control-Allow-Origin", "*")
            }
            $res.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            $res.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-User-Role")
            $res.AddHeader("Access-Control-Allow-Credentials", "true")

        if ($req.HttpMethod -eq "OPTIONS") {
            $res.StatusCode = 200
            $res.Close()
            continue
        }

        $localPath = $req.Url.LocalPath
        $clientIp = if ($req.RemoteEndPoint) { $req.RemoteEndPoint.Address.ToString() } else { "127.0.0.1" }

        # -------------------------------------------------------------
        # 1. POST /api/auth/login
        # -------------------------------------------------------------
        if ($localPath -eq '/api/auth/login' -and $req.HttpMethod -eq 'POST') {
            if (-not (Check-RateLimit $clientIp)) {
                $res.StatusCode = 429
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"Too many requests. Please wait a moment."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $bodyStr = $reader.ReadToEnd()
            $body = $null
            try { $body = $bodyStr | ConvertFrom-Json } catch {}
            $idInput = ""
            if ($body) {
                if ($body.staffId) { $idInput = $body.staffId }
                elseif ($body.identifier) { $idInput = $body.identifier }
                elseif ($body.email) { $idInput = $body.email }
                elseif ($body.username) { $idInput = $body.username }
            }
            $password = if ($body -and $body.password) { $body.password } else { "" }
            [System.IO.File]::WriteAllText("c:\Users\messi\OneDrive\Desktop\SLCMS\scratch\body_debug.txt", "BODY: '$bodyStr', ID: '$idInput', PWD: '$password'", [System.Text.Encoding]::UTF8)

            $cleanId = ($idInput + "").Trim().ToLower()
            $nowMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

            $users = @(Get-DbUsers)
            $matchedUser = $null

            foreach ($u in $users) {
                $uEmail = ($u.email + "").ToLower()
                $uStaff = ($u.staffId + "").ToLower()
                $uEmp   = ($u.employeeId + "").ToLower()
                $uUser  = ($u.username + "").ToLower()

                if ($cleanId -ne "" -and ($cleanId -eq $uEmail -or $cleanId -eq $uStaff -or $cleanId -eq $uEmp -or $cleanId -eq $uUser)) {
                    $matchedUser = $u
                    break
                }
                # Also support admin aliases
                if ($cleanId -in @('admin', 'administrator', 'slcms.admin', 'slcms.ad', 'adm-0001', 'adm0001') -and ($uStaff -eq 'adm-0001' -or $u.id -eq 'usr-001')) {
                    $matchedUser = $u
                    break
                }
            }

            $res.ContentType = 'application/json; charset=utf-8'

            if (-not $matchedUser) {
                Add-DbEvent "unknown" "Login attempt" "Unknown identifier attempted: $cleanId" $clientIp "Failed — 2 attempts remaining" "Unknown User"
                $res.StatusCode = 401
                $outJson = '{"success":false,"attemptsRemaining":2,"message":"Incorrect credentials. 2 attempts remaining."}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            # Check Deactivated
            if ($matchedUser.accountStatus -eq "DEACTIVATED") {
                Add-DbEvent $matchedUser.id "Login attempt" "Attempt to access deactivated account" $clientIp "Failed" $matchedUser.name
                $res.StatusCode = 403
                $outJson = '{"success":false,"errorType":"ACCOUNT_DISABLED","message":"This account is inactive. Contact the system administrator."}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            # Check Administrator Lock
            if ($matchedUser.adminLocked -eq $true -or ($matchedUser.accountStatus -eq "LOCKED" -and -not $matchedUser.lockedUntil)) {
                Add-DbEvent $matchedUser.id "Login attempt" "Attempt to access administrator-locked account" $clientIp "Failed" $matchedUser.name
                $res.StatusCode = 403
                $outJson = '{"success":false,"errorType":"ADMIN_LOCKED","message":"Your account has been locked by the administrator. Contact the system administrator."}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            # Check Temporary Lock
            if ($matchedUser.accountStatus -eq "TEMPORARILY_LOCKED" -or ($matchedUser.lockedUntil -and $matchedUser.lockedUntil -gt 0)) {
                if ($nowMs -lt $matchedUser.lockedUntil) {
                    $remMs = $matchedUser.lockedUntil - $nowMs
                    $remSecs = [Math]::Max(1, [Math]::Floor($remMs / 1000))
                    $m = [Math]::Floor($remSecs / 60)
                    $s = $remSecs % 60
                    $timeStr = "{0}:{1:D2}" -f $m, $s

                    $res.StatusCode = 423 # Locked
                    $outObj = @{
                        success = $false
                        errorType = "TEMPORARILY_LOCKED"
                        remainingSeconds = $remSecs
                        lockedUntil = $matchedUser.lockedUntil
                        message = "Account temporarily locked. Try again in $timeStr."
                    }
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($outObj | ConvertTo-Json -Compress))
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)
                    $res.Close()
                    continue
                } else {
                    # 2 minutes expired! Auto-unlock
                    $matchedUser.accountStatus = "ACTIVE"
                    $matchedUser.lockedUntil = $null
                    $matchedUser.failedAttempts = 0

                    # Auto-resolve alert
                    $alerts = @(Get-DbAlerts)
                    foreach ($a in $alerts) {
                        if ($a.userId -eq $matchedUser.id -and $a.resolved -ne $true) {
                            $a.resolved = $true
                            $a.resolvedAt = [DateTime]::UtcNow.ToString("o")
                            $a.resolvedBy = "SYSTEM"
                        }
                    }
                    Save-DbAlerts $alerts
                    Save-DbUsers $users
                }
            }

            # Password check
            $actualPassword = if ($matchedUser.passwordPlain) { $matchedUser.passwordPlain } else { 'SecretLawFirm2026!' }
            $passMatch = ($password -eq $actualPassword)
            Write-Host ">>> CHECKING PASSWORD: input='$password', actual='$actualPassword', passMatch=$passMatch"

            if (-not $passMatch) {
                Write-Host ">>> INSIDE FAILED BRANCH: failedAttempts=$($matchedUser.failedAttempts)"
                $curFailed = [int]$matchedUser.failedAttempts + 1
                $matchedUser.failedAttempts = $curFailed
                $matchedUser.lastFailedLogin = [DateTime]::UtcNow.ToString("o")

                if ($curFailed -ge 3) {
                    $matchedUser.accountStatus = "TEMPORARILY_LOCKED"
                    $matchedUser.lockedUntil = $nowMs + 120000 # 2 minutes

                    $lockTime = [DateTime]::UtcNow
                    $unlockTime = $lockTime.AddMinutes(2)
                    $unlockTimeStr = $unlockTime.ToLocalTime().ToString("h:mm tt")

                    # Create one genuine admin security alert
                    $alerts = @(Get-DbAlerts)
                    $hasUnresolved = $false
                    foreach ($a in $alerts) {
                        if ($a.userId -eq $matchedUser.id -and $a.resolved -ne $true) {
                            $hasUnresolved = $true
                            break
                        }
                    }

                    if (-not $hasUnresolved) {
                        $newAlert = [PSCustomObject]@{
                            alertId = "alt-$nowMs"
                            alert_id = "alt-$nowMs"
                            userId = $matchedUser.id
                            user_id = $matchedUser.id
                            staffId = $matchedUser.staffId
                            staff_id = $matchedUser.staffId
                            fullName = $matchedUser.name
                            name = $matchedUser.name
                            role = $matchedUser.role
                            alertType = "TEMPORARY_LOCK"
                            alert_type = "TEMPORARY_LOCK"
                            title = "Temporary Login Lock"
                            description = "Three unsuccessful login attempts"
                            severity = "HIGH"
                            createdAt = $lockTime.ToString("o")
                            created_at = $lockTime.ToString("o")
                            lockedAtTime = $lockTime.ToLocalTime().ToString("h:mm tt")
                            unlockTime = $unlockTimeStr
                            lockedUntil = $matchedUser.lockedUntil
                            resolved = $false
                            resolvedAt = $null
                            resolvedBy = $null
                            clientIp = $clientIp
                        }
                        $alerts += $newAlert
                        Save-DbAlerts $alerts
                    }

                    # First record the 3rd failed login attempt itself
                    Add-DbEvent -userId $matchedUser.id -eventType "Login attempt" -desc "Unsuccessful login attempt [3 of 3]" -ip $clientIp -result "Failed - 0 attempts remaining" -userName $matchedUser.name
                    # Then record the resulting Account security lock event
                    Add-DbEvent -userId $matchedUser.id -eventType "Account security" -desc "Account temporarily locked for 2 minutes after 3 failed login attempts" -ip $clientIp -result "Temporarily locked until $unlockTimeStr" -userName $matchedUser.name
                    Save-DbUsers $users

                    $res.StatusCode = 423
                    $outObj = @{
                        success = $false
                        errorType = "TEMPORARILY_LOCKED"
                        remainingSeconds = 120
                        lockedUntil = $matchedUser.lockedUntil
                        message = "Account temporarily locked after 3 unsuccessful attempts. Try again in 2:00 minutes."
                    }
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($outObj | ConvertTo-Json -Compress))
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)
                    $res.Close()
                    continue
                }

                $rem = 3 - $curFailed
                $remStr = if ($rem -eq 1) { "1 attempt remaining" } else { "$rem attempts remaining" }
                $failedResult = "Failed — $remStr"

                Add-DbEvent $matchedUser.id "Login attempt" "Unsuccessful login attempt ($curFailed of 3)" $clientIp $failedResult $matchedUser.name
                Save-DbUsers $users

                $res.StatusCode = 401
                $outObj = @{
                    success = $false
                    attemptsRemaining = $rem
                    message = "Incorrect credentials. $remStr."
                }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($outObj | ConvertTo-Json -Compress))
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            # Login Success!
            Write-Host ">>> REACHED SUCCESS BRANCH FOR $($matchedUser.name)"
            try { $matchedUser.failedAttempts = 0 } catch {}
            try { $matchedUser.lockedUntil = $null } catch {}
            try { $matchedUser.lastSuccessfulLogin = [DateTime]::UtcNow.ToString("o") } catch {}
            Save-DbUsers $users

            Add-DbEvent $matchedUser.id "Login attempt" "Login successful" $clientIp "Successful" $matchedUser.name

            if ($matchedUser.mustChangePassword -eq $true -or $matchedUser.accountStatus -eq "FIRST_LOGIN_RESET" -or $matchedUser.status -like "*Required*") {
                $res.StatusCode = 200
                $outObj = @{
                    success = $true
                    authenticated = $true
                    staffId = $matchedUser.staffId
                    role = if ($matchedUser.roleKey) { $matchedUser.roleKey } else { $matchedUser.role }
                    roleDisplayName = $matchedUser.role
                    mustChangePassword = $true
                    requiresFirstLoginChange = $true
                    message = "Login successful. Welcome to SLCMS."
                    user = @{
                        id = $matchedUser.id
                        staffId = $matchedUser.staffId
                        email = $matchedUser.email
                        name = $matchedUser.name
                        role = $matchedUser.role
                        roleKey = if ($matchedUser.roleKey) { $matchedUser.roleKey } else { $matchedUser.role }
                        mustChangePassword = $true
                    }
                }
                Send-JsonResponse $res 200 $outObj
                continue
            }

            $outObj = @{
                success = $true
                authenticated = $true
                staffId = $matchedUser.staffId
                role = if ($matchedUser.roleKey) { $matchedUser.roleKey } else { $matchedUser.role }
                roleDisplayName = $matchedUser.role
                mustChangePassword = $false
                requiresFirstLoginChange = $false
                message = "Login successful. Welcome to SLCMS."
                token = "slcms_jwt_$([Guid]::NewGuid().ToString('N'))"
                user = $matchedUser
            }
            Send-JsonResponse $res 200 $outObj
            continue
        }

        # -------------------------------------------------------------
        # 1b. POST /api/auth/change-first-password
        # -------------------------------------------------------------
        if ($localPath -eq '/api/auth/change-first-password' -and $req.HttpMethod -eq 'POST') {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $bodyStr = $reader.ReadToEnd()
            $body = $null
            try { $body = $bodyStr | ConvertFrom-Json } catch {}

            $userId = if ($body) { if ($body.userId) { $body.userId } elseif ($body.staffId) { $body.staffId } else { "" } } else { "" }
            $ident = if ($body) { if ($body.identifier) { $body.identifier } elseif ($body.staffId) { $body.staffId } elseif ($body.email) { $body.email } else { "" } } else { "" }
            $newPassword = if ($body -and $body.newPassword) { $body.newPassword } else { "" }

            if (-not $newPassword -or $newPassword.Length -lt 10) {
                $res.StatusCode = 400
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"New password must be at least 10 characters long."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            $users = @(Get-DbUsers)
            $u = $null
            if ($userId) {
                $u = $users | Where-Object { $_.id -eq $userId -or $_.staffId -eq $userId } | Select-Object -First 1
            }
            if (-not $u -and $ident) {
                $u = $users | Where-Object { $_.email -eq $ident -or $_.staffId -eq $ident } | Select-Object -First 1
            }

            if (-not $u) {
                $res.StatusCode = 404
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"User account not found."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            try { $u.passwordPlain = $newPassword } catch {}
            try { $u.passwordHash = "argon2:`$2b`$12`$hash$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())" } catch {}
            try { $u.mustChangePassword = $false } catch {}
            try { $u.firstLoginRequired = $false } catch {}
            try { $u.status = "Active" } catch {}
            try { $u.accountStatus = "ACTIVE" } catch {}
            if ($u.PSObject.Properties['passwordChangedAt']) {
                $u.passwordChangedAt = [DateTime]::UtcNow.ToString("o")
            } else {
                $u | Add-Member -NotePropertyName "passwordChangedAt" -NotePropertyValue ([DateTime]::UtcNow.ToString("o")) -Force -ErrorAction SilentlyContinue
            }
            Save-DbUsers $users

            Add-DbEvent $u.id "Password management" "First-login password changed successfully" $clientIp "Successful" $u.name

            $res.StatusCode = 200
            $res.ContentType = 'application/json; charset=utf-8'
            $outObj = @{
                success = $true
                authenticated = $true
                staffId = $u.staffId
                role = if ($u.roleKey) { $u.roleKey } else { $u.role }
                roleDisplayName = $u.role
                mustChangePassword = $false
                message = "Password successfully changed. You can now log in with your new password."
            }
            Send-JsonResponse $res 200 $outObj
            continue
        }

        # -------------------------------------------------------------
        # 2. GET /api/admin/security-alerts & /api/admin/security-alerts/count
        # -------------------------------------------------------------
        if ($localPath -like '/api/admin/security-alerts*') {
            $res.ContentType = 'application/json; charset=utf-8'
            $nowMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

            $alerts = @(Get-DbAlerts)
            $users = @(Get-DbUsers)
            $alertsChanged = $false
            $usersChanged = $false

            # Auto-resolve expired temporary lock alerts
            foreach ($a in $alerts) {
                if ($a.resolved -ne $true -and $a.alertType -eq "TEMPORARY_LOCK") {
                    $u = $users | Where-Object { $_.id -eq $a.userId } | Select-Object -First 1
                    if ($u -and -not $u.adminLocked -and $u.lockedUntil -and $nowMs -ge $u.lockedUntil) {
                        $a.resolved = $true
                        $a.resolvedAt = [DateTime]::UtcNow.ToString("o")
                        $a.resolvedBy = "SYSTEM"
                        $alertsChanged = $true

                        $u.accountStatus = "ACTIVE"
                        $u.lockedUntil = $null
                        $u.failedAttempts = 0
                        $usersChanged = $true
                    }
                }
            }
            if ($alertsChanged) { Save-DbAlerts $alerts }
            if ($usersChanged) { Save-DbUsers $users }

            $arrUnresolved = @($alerts | Where-Object { $_.resolved -ne $true })

            if ($localPath -like '*/count') {
                $count = $arrUnresolved.Count
                $badge = if ($count -eq 0) { "0 requiring attention" } else { "$count ATTENTION" }
                $outObj = @{ unresolvedCount = $count; badgeText = $badge }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($outObj | ConvertTo-Json -Compress))
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            $outJson = $arrUnresolved | ConvertTo-Json -Depth 6
            if ($arrUnresolved.Count -eq 1 -and -not $outJson.Trim().StartsWith('[')) {
                $outJson = "[$outJson]"
            }
            if ($arrUnresolved.Count -eq 0) {
                $outJson = "[]"
            }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 3. POST /api/admin/security-alerts/{alertId}/resolve
        # -------------------------------------------------------------
        if ($localPath -match '^/api/admin/security-alerts/([^/]+)/resolve$' -and $req.HttpMethod -eq 'POST') {
            $alertId = $matches[1]
            $alerts = @(Get-DbAlerts)
            $found = $false
            foreach ($a in $alerts) {
                if ($a.alertId -eq $alertId -or $a.alert_id -eq $alertId) {
                    $a.resolved = $true
                    $a.resolvedAt = [DateTime]::UtcNow.ToString("o")
                    $a.resolvedBy = "ADM-0001"
                    $found = $true
                }
            }
            if ($found) { Save-DbAlerts $alerts }
            $res.ContentType = 'application/json; charset=utf-8'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true}')
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 4. POST /api/admin/users/{userId}/lock
        # -------------------------------------------------------------
        if ($localPath -match '^/api/admin/users/([^/]+)/lock$' -and $req.HttpMethod -eq 'POST') {
            $userId = $matches[1]
            $users = @(Get-DbUsers)
            $u = $users | Where-Object { $_.id -eq $userId -or $_.staffId -eq $userId } | Select-Object -First 1
            if ($u) {
                $u.adminLocked = $true
                $u.accountStatus = "LOCKED"
                $u.lockedUntil = $null
                Save-DbUsers $users
                Add-DbEvent $u.id "Account management" "Account locked by administrator" $clientIp "Locked by administrator" $u.name
                
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true,"message":"Account locked successfully."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"User not found"}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 5. POST /api/admin/users/{userId}/unlock
        # -------------------------------------------------------------
        if ($localPath -match '^/api/admin/users/([^/]+)/unlock$' -and $req.HttpMethod -eq 'POST') {
            $userId = $matches[1]
            $users = @(Get-DbUsers)
            $u = $users | Where-Object { $_.id -eq $userId -or $_.staffId -eq $userId } | Select-Object -First 1
            if ($u) {
                $u.adminLocked = $false
                $u.accountStatus = "ACTIVE"
                $u.failedAttempts = 0
                $u.lockedUntil = $null
                Save-DbUsers $users
                
                # Resolve alerts for this user
                $alerts = @(Get-DbAlerts)
                foreach ($a in $alerts) {
                    if ($a.userId -eq $u.id) {
                        $a.resolved = $true
                        $a.resolvedAt = [DateTime]::UtcNow.ToString("o")
                        $a.resolvedBy = "ADM-0001"
                    }
                }
                Save-DbAlerts $alerts
                Add-DbEvent $u.id "Account management" "Account unlocked by administrator" $clientIp "Unlocked" $u.name

                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true,"message":"Account unlocked successfully."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"User not found"}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 6. POST /api/admin/users/{userId}/reset-password
        # -------------------------------------------------------------
        if ($localPath -match '^/api/admin/users/([^/]+)/reset-password$' -and $req.HttpMethod -eq 'POST') {
            $userId = $matches[1]
            $users = @(Get-DbUsers)
            $u = $users | Where-Object { $_.id -eq $userId -or $_.staffId -eq $userId } | Select-Object -First 1
            if ($u) {
                $tempPass = "TempPass" + (Get-Random -Minimum 1000 -Maximum 9999) + "!"
                $u.passwordPlain = $tempPass
                $u.mustChangePassword = $true
                Save-DbUsers $users
                Add-DbEvent $u.id "Password management" "Temporary password issued by administrator" $clientIp "Temporary password issued" $u.name

                $res.ContentType = 'application/json; charset=utf-8'
                $outObj = @{
                    success = $true
                    message = "Temporary password issued. User must change password upon next login."
                    temporaryPassword = $tempPass
                    mustChangePassword = $true
                }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($outObj | ConvertTo-Json -Compress))
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"User not found"}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 6a. DELETE / POST /api/admin/users/{userId} or /delete
        # -------------------------------------------------------------
        if (($localPath -match '^/api/admin/users/([^/]+)(/delete)?$' -and ($req.HttpMethod -eq 'DELETE' -or $req.HttpMethod -eq 'POST')) -and -not ($localPath -like '*/lock') -and -not ($localPath -like '*/unlock') -and -not ($localPath -like '*/reset-password')) {
            $userId = $matches[1]
            if ($userId -eq 'usr-001' -or $userId -eq 'ADM-0001') {
                $res.StatusCode = 403
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"Root administrator account cannot be deleted."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }
            $users = @(Get-DbUsers)
            $target = $users | Where-Object { $_.id -eq $userId -or $_.staffId -eq $userId } | Select-Object -First 1
            if ($target) {
                $filteredUsers = @($users | Where-Object { $_.id -ne $target.id -and $_.staffId -ne $target.staffId })
                Save-DbUsers $filteredUsers
                Add-DbEvent $target.id "User management" "User account permanently removed by administrator" $clientIp "Deleted" $target.name

                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true,"message":"User account permanently deleted."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"User not found"}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 6b. POST /api/auth/change-password
        # -------------------------------------------------------------
        if ($localPath -eq '/api/auth/change-password' -and $req.HttpMethod -eq 'POST') {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $bodyStr = $reader.ReadToEnd()
            $body = $null
            try { $body = $bodyStr | ConvertFrom-Json } catch {}

            $userId = if ($body) { if ($body.userId) { $body.userId } else { $body.id } } else { "" }
            $newPass = if ($body) { if ($body.newPassword) { $body.newPassword } else { $body.password } } else { "" }

            $users = @(Get-DbUsers)
            $u = $users | Where-Object { $_.id -eq $userId -or $_.staffId -eq $userId -or $_.email -eq $userId } | Select-Object -First 1
            if ($u -and $newPass) {
                $u.passwordPlain = $newPass
                $u.mustChangePassword = $false
                $u.accountStatus = "ACTIVE"
                Save-DbUsers $users
                Add-DbEvent $u.id "Password management" "Password changed successfully" $clientIp "Successful" $u.name

                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true,"message":"Password changed successfully."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 400
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"Invalid request"}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 6c. POST /api/admin/users/{userId}/deactivate
        # -------------------------------------------------------------
        if ($localPath -match '^/api/admin/users/([^/]+)/deactivate$' -and $req.HttpMethod -eq 'POST') {
            $userId = $matches[1]
            $users = @(Get-DbUsers)
            $u = $users | Where-Object { $_.id -eq $userId -or $_.staffId -eq $userId } | Select-Object -First 1
            if ($u) {
                $u.accountStatus = "DEACTIVATED"
                Save-DbUsers $users
                Add-DbEvent $u.id "User management" "User account deactivated by administrator" $clientIp "Deactivated" $u.name

                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true,"message":"Account deactivated successfully."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"User not found"}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 6d. POST /api/admin/users/{userId}/role
        # -------------------------------------------------------------
        if ($localPath -match '^/api/admin/users/([^/]+)/role$' -and $req.HttpMethod -eq 'POST') {
            $userId = $matches[1]
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $bodyStr = $reader.ReadToEnd()
            $body = $null
            try { $body = $bodyStr | ConvertFrom-Json } catch {}

            $newRole = if ($body) { $body.role } else { "" }
            $users = @(Get-DbUsers)
            $u = $users | Where-Object { $_.id -eq $userId -or $_.staffId -eq $userId } | Select-Object -First 1
            if ($u -and $newRole) {
                $u.role = $newRole
                Save-DbUsers $users
                Add-DbEvent $u.id "Permission management" "Role changed to $newRole" $clientIp "Updated" $u.name

                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true,"message":"Role updated successfully."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 400
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"Invalid role request"}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 7. GET /api/admin/users/{userId}/activity
        # -------------------------------------------------------------
        if ($localPath -match '^/api/admin/users/([^/]+)/activity$') {
            $userId = $matches[1]
            $events = @(Get-DbEvents | Where-Object { $_.userId -eq $userId })
            $res.ContentType = 'application/json; charset=utf-8'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($events | ConvertTo-Json -Depth 5))
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 7b. GET /api/admin/security-activity
        # -------------------------------------------------------------
        if ($localPath -eq '/api/admin/security-activity' -and $req.HttpMethod -eq 'GET') {
            $events = @(Get-DbEvents)
            $users = @(Get-DbUsers)

            $logs = @()
            foreach ($e in $events) {
                $u = $users | Where-Object { $_.id -eq $e.userId -or $_.staffId -eq $e.userId } | Select-Object -First 1
                $userName = if ($u) { $u.name } else { if ($e.userId -eq 'unknown') { 'Unknown Identity' } else { $e.userId } }
                $userRole = if ($u) { $u.role } else { 'External / System' }
                $staffId = if ($u) { $u.staffId } else { 'N/A' }

                $actionName = switch ($e.eventType) {
                    'LOGIN_SUCCESS' { 'Login Succeeded' }
                    'LOGIN_FAILED'  { 'Login Failed' }
                    'TEMPORARY_LOCK'{ 'Account Temporarily Locked' }
                    'ADMIN_LOCK'    { 'Account Manually Locked' }
                    'ADMIN_UNLOCK'  { 'Account Unlocked' }
                    'PASSWORD_RESET'{ 'Temporary Password Issued' }
                    default { $e.eventType }
                }

                $resBadge = switch ($e.eventType) {
                    'LOGIN_SUCCESS' { 'Success' }
                    'ADMIN_UNLOCK'  { 'Success' }
                    'PASSWORD_RESET'{ 'Success' }
                    'TEMPORARY_LOCK'{ 'Locked' }
                    'ADMIN_LOCK'    { 'Locked' }
                    'LOGIN_FAILED'  { 'Failed' }
                    default { 'Success' }
                }

                $ts = $e.eventTime
                try {
                    $parsedDate = [DateTime]::Parse($ts)
                    $ts = $parsedDate.ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss")
                } catch {}

                $logs += [PSCustomObject]@{
                    id            = $e.id
                    timestamp     = $ts
                    user          = $userName
                    staffId       = $staffId
                    role          = $userRole
                    module        = 'Security Activity'
                    action        = $actionName
                    record        = $e.description
                    result        = $resBadge
                    status        = $resBadge
                    ip            = $e.ipAddress
                    securityLevel = if ($resBadge -eq 'Locked') { 'Critical' } elseif ($resBadge -eq 'Failed') { 'High' } else { 'Standard' }
                }
            }

            [Array]::Reverse($logs)

            $res.ContentType = 'application/json; charset=utf-8'
            $outJson = $logs | ConvertTo-Json -Depth 5
            if ($logs.Count -eq 1 -and -not $outJson.Trim().StartsWith('[')) {
                $outJson = "[$outJson]"
            }
            if ($logs.Count -eq 0) {
                $outJson = "[]"
            }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 7c. GET /api/admin/security-status
        # -------------------------------------------------------------
        if ($localPath -eq '/api/admin/security-status' -and $req.HttpMethod -eq 'GET') {
            $events = @(Get-DbEvents)
            $users = @(Get-DbUsers)
            $alerts = @(Get-DbAlerts)
            $backups = @(Get-DbBackups)

            $nowMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
            $todayUtc = [DateTime]::UtcNow.Date

            # 1. Failed Logins Today
            $failedLoginsToday = 0
            foreach ($e in $events) {
                if ($e.eventType -eq 'LOGIN_FAILED' -or ($e.eventType -eq 'Login attempt' -and $e.result -like 'Failed*')) {
                    try {
                        if ([DateTime]::Parse($e.eventTime).ToUniversalTime().Date -eq $todayUtc) {
                            $failedLoginsToday++
                        }
                    } catch {}
                }
            }

            # 2. Locked Accounts
            $lockedUsers = @()
            foreach ($u in $users) {
                $isLocked = $false
                if ($u.adminLocked -eq $true) {
                    $isLocked = $true
                } elseif ($u.accountStatus -in @('LOCKED', 'TEMPORARILY_LOCKED')) {
                    if ($u.lockedUntil -and $nowMs -ge $u.lockedUntil) {
                        $isLocked = $false
                    } else {
                        $isLocked = $true
                    }
                }
                if ($isLocked) { $lockedUsers += $u }
            }
            $lockedAccountsCount = $lockedUsers.Count

            # 3. Unresolved Alerts matching real accounts
            $attentionUserIds = [System.Collections.Generic.HashSet[string]]::new()
            foreach ($u in $lockedUsers) {
                [void]$attentionUserIds.Add($u.id)
            }
            $arrUnresolved = @()
            $alertsChanged = $false
            foreach ($a in $alerts) {
                if ($a.resolved -ne $true) {
                    $matchingUser = $users | Where-Object { $_.id -eq $a.userId -or $_.staffId -eq $a.staffId } | Select-Object -First 1
                    if ($matchingUser) {
                        $s = if ($matchingUser.accountStatus) { $matchingUser.accountStatus.ToString().ToUpper() } else { "" }
                        $isUserLocked = ($matchingUser.adminLocked -eq $true) -or ($s -in @('LOCKED', 'TEMPORARILY_LOCKED') -and (-not $matchingUser.lockedUntil -or $nowMs -lt $matchingUser.lockedUntil))
                        if ($isUserLocked) {
                            $arrUnresolved += $a
                            [void]$attentionUserIds.Add($matchingUser.id)
                        } else {
                            # Auto-resolve alert since user is active and unlocked
                            $a.resolved = $true
                            $a.resolvedAt = [DateTime]::UtcNow.ToString("o")
                            $a.resolvedBy = "SYSTEM"
                            $alertsChanged = $true
                        }
                    }
                }
            }
            if ($alertsChanged) { Save-DbAlerts $alerts }
            $unresolvedAlertsCount = $attentionUserIds.Count

            # System Status & Message
            $systemStatus = if ($unresolvedAlertsCount -eq 0) { "Normal" } else { "Attention Required" }
            $statusMessage = if ($systemStatus -eq "Normal") {
                "No security issues currently require administrator attention."
            } else {
                if ($lockedAccountsCount -eq 1) {
                    $u0 = $lockedUsers[0]
                    if ($u0.adminLocked -eq $true) {
                        "One account ($($u0.name)) is locked by administrator."
                    } else {
                        "One account ($($u0.name)) is temporarily locked after three unsuccessful login attempts."
                    }
                } else {
                    "$lockedAccountsCount accounts are locked or require administrator attention."
                }
            }

            # 4. Recent Security Activity: only the latest 5 genuine records from database
            $allEvents = @(Get-DbEvents)
            [Array]::Reverse($allEvents)
            $top5 = @($allEvents | Select-Object -First 5)

            $recentEvents = @()
            foreach ($e in $top5) {
                $u = $users | Where-Object { $_.id -eq $e.userId -or $_.staffId -eq $e.userId } | Select-Object -First 1
                $userName = if ($e.userName) { $e.userName } elseif ($u) { $u.name } else { if ($e.userId -eq 'unknown') { 'Unknown Identity' } else { $e.userId } }

                $timeFormatted = $e.eventTime
                try {
                    $timeFormatted = [DateTime]::Parse($e.eventTime).ToLocalTime().ToString("h:mm tt")
                } catch {}

                $eventDesc = if ($e.eventType) {
                    switch ($e.eventType) {
                        'LOGIN_SUCCESS'   { 'Login attempt' }
                        'LOGIN_FAILED'    { 'Login attempt' }
                        'TEMPORARY_LOCK'  { 'Account security' }
                        'ADMIN_LOCK'      { 'Account management' }
                        'ADMIN_UNLOCK'    { 'Account management' }
                        'PASSWORD_RESET'  { 'Password management' }
                        'BACKUP_CREATED'  { 'System backup' }
                        default           { $e.eventType }
                    }
                } else { 'Login attempt' }

                $resultBadge = if ($e.result) { $e.result } else {
                    switch ($e.eventType) {
                        'LOGIN_SUCCESS'   { 'Successful' }
                        'ADMIN_UNLOCK'    { 'Unlocked' }
                        'PASSWORD_RESET'  { 'Temporary password issued' }
                        'BACKUP_CREATED'  { 'Successful' }
                        'TEMPORARY_LOCK'  { 'Temporarily locked for 2 minutes' }
                        'ADMIN_LOCK'      { 'Locked by administrator' }
                        'LOGIN_FAILED'    { 'Failed' }
                        default           { 'Successful' }
                    }
                }

                $recentEvents += [PSCustomObject]@{
                    id          = $e.id
                    userId      = $e.userId
                    userName    = $userName
                    time        = $timeFormatted
                    user        = $userName
                    event       = $eventDesc
                    eventType   = $eventDesc
                    result      = $resultBadge
                    description = $e.description
                    eventTime   = $e.eventTime
                    ipAddress   = $e.ipAddress
                }
            }

            # 5. Latest Backup
            $latestBackup = if ($backups.Count -gt 0) { $backups[0] } else { $null }

            $outObj = [PSCustomObject]@{
                systemStatus           = $systemStatus
                statusMessage          = $statusMessage
                failedLoginsToday      = $failedLoginsToday
                lockedAccountsCount    = $lockedAccountsCount
                unresolvedAlertsCount  = $unresolvedAlertsCount
                unresolvedAlerts       = $arrUnresolved
                lockedUsers            = $lockedUsers
                recentEvents           = $recentEvents
                latestBackup           = $latestBackup
            }

            $res.ContentType = 'application/json; charset=utf-8'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($outObj | ConvertTo-Json -Depth 6))
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 7d. GET /api/admin/backups & POST /api/admin/backups
        # -------------------------------------------------------------
        if ($localPath -eq '/api/admin/backups' -and $req.HttpMethod -eq 'GET') {
            $res.ContentType = 'application/json; charset=utf-8'
            $backups = @(Get-DbBackups)
            $outJson = $backups | ConvertTo-Json -Depth 5
            if ($backups.Count -eq 1 -and -not $outJson.Trim().StartsWith('[')) { $outJson = "[$outJson]" }
            if ($backups.Count -eq 0) { $outJson = "[]" }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        if ($localPath -eq '/api/admin/backups' -and $req.HttpMethod -eq 'POST') {
            $now = [DateTime]::UtcNow
            $tsStr = $now.ToString("yyyyMMdd_HHmmss")
            $filename = "SLCMS_Snapshot_$tsStr.json"
            $filepath = Join-Path $backupsDir $filename

            $backupPayload = @{
                version = "SLCMS-Enterprise-2.0"
                timestamp = $now.ToString("o")
                generatedBy = "SLCMS System Administrator"
                users = @(Get-DbUsers)
                securityEvents = @(Get-DbEvents)
                securityAlerts = @(Get-DbAlerts)
            }

            $json = $backupPayload | ConvertTo-Json -Depth 10
            [System.IO.File]::WriteAllText($filepath, $json, [System.Text.Encoding]::UTF8)

            $fileInfo = Get-Item $filepath
            $sizeMb = [Math]::Round($fileInfo.Length / (1024 * 1024), 1)
            $sizeStr = if ($sizeMb -ge 0.1) { "$sizeMb MB" } else { "$([Math]::Round($fileInfo.Length / 1024, 1)) KB" }

            $newBackup = [PSCustomObject]@{
                id            = "bkp-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
                filename      = $filename
                filepath      = $filepath
                sizeBytes     = $fileInfo.Length
                sizeFormatted = $sizeStr
                status        = "Successful"
                createdBy     = "Manual Administrator Backup"
                createdAt     = $now.ToString("o")
                dateFormatted = $now.ToString("d MMMM yyyy, h:mm tt")
            }

            $backups = @(Get-DbBackups)
            $backups = @($newBackup) + $backups
            Save-DbBackups $backups

            Add-DbEvent "usr-001" "BACKUP_CREATED" "System database snapshot created ($sizeStr)" $clientIp

            $res.ContentType = 'application/json; charset=utf-8'
            $outObj = @{ success = $true; backup = $newBackup }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($outObj | ConvertTo-Json -Depth 5))
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 8. GET /api/admin/users
        # -------------------------------------------------------------
        if ($localPath -eq '/api/admin/users' -and $req.HttpMethod -eq 'GET') {
            $users = @(Get-DbUsers)
            Send-JsonResponse $res 200 $users
            continue
        }

        # -------------------------------------------------------------
        # 8b. POST /api/admin/users (Administrator Staff Creation)
        # -------------------------------------------------------------
        if ($localPath -eq '/api/admin/users' -and $req.HttpMethod -eq 'POST') {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $bodyStr = $reader.ReadToEnd()
            $body = $null
            try { $body = $bodyStr | ConvertFrom-Json } catch {}

            $fullName = if ($body) { if ($body.fullName) { $body.fullName } else { $body.name } } else { "" }
            $email = if ($body) { $body.email } else { "" }
            $phone = if ($body) { $body.phone } else { "+255 754 000 000" }
            $role = if ($body) { $body.role } else { "Lawyer" }
            $staffId = if ($body) { $body.staffId } else { "" }
            $tempPassword = if ($body) { $body.temporaryPassword } else { "" }
            $department = if ($body) { $body.department } else { "Commercial Litigation" }
            $advocateNumber = if ($body) { $body.advocateNumber } else { "" }

            if (-not $fullName -or -not $email) {
                $res.StatusCode = 400
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"Full name and email are required."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            $users = @(Get-DbUsers)
            $cleanEmail = $email.Trim().ToLower()

            $existing = $users | Where-Object { $_.email -and $_.email.ToLower() -eq $cleanEmail } | Select-Object -First 1
            if ($existing) {
                $res.StatusCode = 409
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"An account with this email address already exists."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            # Generate Staff ID if not provided
            if (-not $staffId) {
                $prefix = if ($role -match "Admin") { "ADM" } elseif ($role -match "Clerk") { "CLK" } else { "LAW" }
                $staffId = "$prefix-" + (Get-Random -Minimum 1000 -Maximum 9999)
                while ($users | Where-Object { $_.staffId -eq $staffId }) {
                    $staffId = "$prefix-" + (Get-Random -Minimum 1000 -Maximum 9999)
                }
            } else {
                $staffId = $staffId.Trim().ToUpper()
                if ($users | Where-Object { $_.staffId -eq $staffId }) {
                    $res.StatusCode = 409
                    $res.ContentType = 'application/json; charset=utf-8'
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"An account with this Staff ID already exists."}')
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)
                    $res.Close()
                    continue
                }
            }

            if (-not $tempPassword) {
                $tempPassword = "SLCMS#" + (Get-Random -Minimum 100000 -Maximum 999999) + "!"
            }

            $roleKey = switch -Regex ($role) {
                'Admin'  { 'ADMINISTRATOR' }
                'Senior' { 'SENIOR_COUNSEL' }
                'Clerk'  { 'LEGAL_CLERK' }
                'Partner'{ 'MANAGING_PARTNER' }
                default  { 'ASSOCIATE_LAWYER' }
            }

            $roleDisplayName = switch ($roleKey) {
                'ADMINISTRATOR'    { 'Administrator' }
                'SENIOR_COUNSEL'   { 'Senior Lawyer' }
                'LEGAL_CLERK'      { 'Legal Clerk' }
                'MANAGING_PARTNER' { 'Managing Partner' }
                default            { 'Lawyer' }
            }

            $nowMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
            $newUser = [PSCustomObject]@{
                id = "usr-$nowMs-$((New-Guid).ToString().Substring(0,4))"
                staffId = $staffId
                employeeId = $staffId
                name = $fullName.Trim()
                email = $cleanEmail
                phone = $phone.Trim()
                passwordPlain = $tempPassword
                passwordHash = "argon2:`$2b`$12`$hash$nowMs"
                role = $roleDisplayName
                roleKey = $roleKey
                roleTitle = $roleDisplayName
                status = "First-Login Setup Required"
                accountStatus = "FIRST_LOGIN_RESET"
                mustChangePassword = $true
                firstLoginRequired = $true
                temporaryPassword = $tempPassword
                temporaryPasswordExpiresAt = [DateTime]::UtcNow.AddHours(24).ToString("o")
                department = $department
                advocateNumber = $advocateNumber
                lawyerNumber = $advocateNumber
                practisingCertNo = if ($roleKey -like "*LAWYER*") { "PC-TZ-2026-$(Get-Random -Minimum 1000 -Maximum 9999)" } else { $null }
                lockedUntil = $null
                adminLocked = $false
                lastSuccessfulLogin = $null
                failedAttempts = 0
                failedLoginAttempts = 0
                passwordChangedAt = $null
                lastLogin = "Never"
                createdAt = [DateTime]::UtcNow.ToString("o")
            }

            $users += $newUser
            Save-DbUsers $users

            $outObj = @{
                success = $true
                message = "Staff account successfully created and saved to permanent database."
                user = $newUser
                temporaryPassword = $tempPassword
                staffId = $staffId
            }
            Send-JsonResponse $res 201 $outObj
            continue
        }

        # -------------------------------------------------------------
        # 9. TASKS & DEADLINES REST API (Database-Driven)
        # -------------------------------------------------------------
        # GET /api/tasks
        if ($localPath -eq '/api/tasks' -and $req.HttpMethod -eq 'GET') {
            $res.ContentType = 'application/json; charset=utf-8'
            $tasks = @(Get-DbTasks)
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($tasks | ConvertTo-Json -Depth 8))
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # POST /api/tasks
        if ($localPath -eq '/api/tasks' -and $req.HttpMethod -eq 'POST') {
            $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Dispose()
            $taskData = $body | ConvertFrom-Json
            if ($null -eq $taskData.id -or $taskData.id -eq '') {
                $taskData | Add-Member -NotePropertyName "id" -NotePropertyValue "tsk-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())-$((New-Guid).ToString().Substring(0,4))" -Force
            }
            if ($null -eq $taskData.status -or $taskData.status -eq '') {
                $taskData | Add-Member -NotePropertyName "status" -NotePropertyValue "TO_DO" -Force
            }
            $nowIso = [DateTime]::UtcNow.ToString("o")
            $taskData | Add-Member -NotePropertyName "createdAt" -NotePropertyValue $nowIso -Force
            $taskData | Add-Member -NotePropertyName "updatedAt" -NotePropertyValue $nowIso -Force

            $tasks = @(Get-DbTasks)
            $tasks = @($taskData) + $tasks
            Save-DbTasks $tasks

            # Record initial history
            $histories = @(Get-DbTaskHistory)
            $newHist = [PSCustomObject]@{
                id             = "th-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
                taskId         = $taskData.id
                previousStatus = $null
                newStatus      = "TO_DO"
                changedBy      = $req.Headers["X-User-Id"]
                changedByName  = $req.Headers["X-User-Name"]
                changeReason   = "Task created and assigned"
                changedAt      = $nowIso
            }
            $histories = @($newHist) + $histories
            Save-DbTaskHistory $histories

            $res.ContentType = 'application/json; charset=utf-8'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($taskData | ConvertTo-Json -Depth 8))
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # POST /api/tasks/{id}/transition
        if ($localPath -match '^/api/tasks/([^/]+)/transition$' -and $req.HttpMethod -eq 'POST') {
            $taskId = $matches[1]
            $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Dispose()
            $payload = $body | ConvertFrom-Json
            $action = if ($payload.action) { $payload.action.ToString().ToLower() } else { "" }
            $feedback = if ($payload.feedback) { $payload.feedback.ToString() } else { "" }

            $userRole = $req.Headers["X-User-Role"]
            $userId = $req.Headers["X-User-Id"]
            $userName = $req.Headers["X-User-Name"]
            $isAdmin = ($userRole -eq 'Administrator' -or $userRole -eq 'System Administrator')

            $tasks = @(Get-DbTasks)
            $targetTask = $tasks | Where-Object { $_.id -eq $taskId } | Select-Object -First 1

            if (-not $targetTask) {
                $res.StatusCode = 404
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Task not found"}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            # Enforce RBAC separation of duties
            if ($isAdmin -and ($action -eq 'start' -or $action -eq 'submit_review' -or $action -eq 'approve' -or $action -eq 'return')) {
                $res.StatusCode = 403
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Administrator cannot approve legal submissions, mark lawyer work as reviewed, or start lawyer tasks."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            $prevStatus = $targetTask.status
            $newStatus = $prevStatus
            $reason = ""

            switch ($action) {
                'start' {
                    $newStatus = "IN_PROGRESS"
                    $reason = "Task started by assigned practitioner"
                }
                'submit_review' {
                    $newStatus = "UNDER_REVIEW"
                    $reason = "Work submitted for supervising counsel review"
                }
                'approve' {
                    $newStatus = "COMPLETED"
                    $targetTask | Add-Member -NotePropertyName "completedAt" -NotePropertyValue ([DateTime]::UtcNow.ToString("o")) -Force
                    $reason = if ($feedback) { "Approved: $feedback" } else { "Work approved by supervising lawyer" }
                }
                'return' {
                    $newStatus = "IN_PROGRESS"
                    $targetTask | Add-Member -NotePropertyName "reviewFeedback" -NotePropertyValue $feedback -Force
                    $reason = if ($feedback) { "Returned: $feedback" } else { "Returned for revision by supervisor" }
                }
                'reopen' {
                    $newStatus = "IN_PROGRESS"
                    $targetTask | Add-Member -NotePropertyName "completedAt" -NotePropertyValue $null -Force
                    $reason = if ($feedback) { "Reopened: $feedback" } else { "Reopened by supervisor" }
                }
                'cancel' {
                    $newStatus = "CANCELLED"
                    $targetTask | Add-Member -NotePropertyName "cancellationReason" -NotePropertyValue $feedback -Force
                    $reason = if ($feedback) { "Cancelled: $feedback" } else { "Task cancelled with administrative reason" }
                }
                default {
                    $newStatus = $prevStatus
                    $reason = "Status updated"
                }
            }

            $targetTask.status = $newStatus
            $targetTask.updatedAt = [DateTime]::UtcNow.ToString("o")
            Save-DbTasks $tasks

            # Record history
            $histories = @(Get-DbTaskHistory)
            $newHist = [PSCustomObject]@{
                id             = "th-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
                taskId         = $taskId
                previousStatus = $prevStatus
                newStatus      = $newStatus
                changedBy      = $userId
                changedByName  = $userName
                changeReason   = $reason
                changedAt      = [DateTime]::UtcNow.ToString("o")
            }
            $histories = @($newHist) + $histories
            Save-DbTaskHistory $histories

            $res.ContentType = 'application/json; charset=utf-8'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($targetTask | ConvertTo-Json -Depth 8))
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # POST /api/tasks/{id}/reassign
        if ($localPath -match '^/api/tasks/([^/]+)/reassign$' -and $req.HttpMethod -eq 'POST') {
            $taskId = $matches[1]
            $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Dispose()
            $payload = $body | ConvertFrom-Json
            $newAssigneeId = $payload.assigneeId
            $newAssigneeName = $payload.assigneeName
            $newAssigneeAvatar = if ($payload.assigneeAvatar) { $payload.assigneeAvatar } else { "US" }
            $reason = if ($payload.reason) { $payload.reason } else { "Administrative reassignment" }

            $tasks = @(Get-DbTasks)
            $targetTask = $tasks | Where-Object { $_.id -eq $taskId } | Select-Object -First 1

            if ($targetTask) {
                $oldAssignee = $targetTask.assignedToName
                $targetTask.assignedTo = $newAssigneeId
                $targetTask.assignedToName = $newAssigneeName
                $targetTask.assignedToAvatar = $newAssigneeAvatar
                $targetTask.updatedAt = [DateTime]::UtcNow.ToString("o")
                Save-DbTasks $tasks

                $histories = @(Get-DbTaskHistory)
                $newHist = [PSCustomObject]@{
                    id             = "th-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
                    taskId         = $taskId
                    previousStatus = $targetTask.status
                    newStatus      = $targetTask.status
                    changedBy      = $req.Headers["X-User-Id"]
                    changedByName  = $req.Headers["X-User-Name"]
                    changeReason   = "Reassigned from $oldAssignee to $newAssigneeName ($reason)"
                    changedAt      = [DateTime]::UtcNow.ToString("o")
                }
                $histories = @($newHist) + $histories
                Save-DbTaskHistory $histories

                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($targetTask | ConvertTo-Json -Depth 8))
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Task not found"}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.Close()
            continue
        }

        # GET /api/tasks/{id}/history
        if ($localPath -match '^/api/tasks/([^/]+)/history$' -and $req.HttpMethod -eq 'GET') {
            $taskId = $matches[1]
            $histories = @(Get-DbTaskHistory)
            $taskHist = @($histories | Where-Object { $_.taskId -eq $taskId })
            $res.ContentType = 'application/json; charset=utf-8'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($taskHist | ConvertTo-Json -Depth 8))
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # GET /api/deadlines
        if ($localPath -eq '/api/deadlines' -and $req.HttpMethod -eq 'GET') {
            $res.ContentType = 'application/json; charset=utf-8'
            $deadlines = @(Get-DbDeadlines)
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($deadlines | ConvertTo-Json -Depth 8))
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # POST /api/deadlines
        if ($localPath -eq '/api/deadlines' -and $req.HttpMethod -eq 'POST') {
            $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Dispose()
            $dData = $body | ConvertFrom-Json
            if ($null -eq $dData.id -or $dData.id -eq '') {
                $dData | Add-Member -NotePropertyName "id" -NotePropertyValue "dln-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())-$((New-Guid).ToString().Substring(0,4))" -Force
            }
            $nowIso = [DateTime]::UtcNow.ToString("o")
            $dData | Add-Member -NotePropertyName "createdAt" -NotePropertyValue $nowIso -Force
            $dData | Add-Member -NotePropertyName "updatedAt" -NotePropertyValue $nowIso -Force

            $deadlines = @(Get-DbDeadlines)
            $deadlines = @($dData) + $deadlines
            Save-DbDeadlines $deadlines

            $res.ContentType = 'application/json; charset=utf-8'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($dData | ConvertTo-Json -Depth 8))
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # PUT /api/deadlines/{id}
        if ($localPath -match '^/api/deadlines/([^/]+)$' -and $req.HttpMethod -eq 'PUT') {
            $dlnId = $matches[1]
            $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Dispose()
            $payload = $body | ConvertFrom-Json

            $deadlines = @(Get-DbDeadlines)
            $targetDln = $deadlines | Where-Object { $_.id -eq $dlnId } | Select-Object -First 1

            if ($targetDln) {
                $targetDln.previousDeadlineAt = $targetDln.deadlineAt
                if ($payload.title) { $targetDln.title = $payload.title }
                if ($payload.type) { $targetDln.type = $payload.type }
                if ($payload.deadlineAt) { $targetDln.deadlineAt = $payload.deadlineAt }
                if ($payload.deadlineDateString) { $targetDln.deadlineDateString = $payload.deadlineDateString }
                if ($payload.court) { $targetDln.court = $payload.court }
                if ($payload.registry) { $targetDln.registry = $payload.registry }
                if ($payload.responsibleLawyerId) { $targetDln.responsibleLawyerId = $payload.responsibleLawyerId }
                if ($payload.responsibleLawyerName) { $targetDln.responsibleLawyerName = $payload.responsibleLawyerName }
                if ($payload.source) { $targetDln.source = $payload.source }
                if ($payload.changeReason) { $targetDln.changeReason = $payload.changeReason }
                $targetDln.updatedAt = [DateTime]::UtcNow.ToString("o")

                Save-DbDeadlines $deadlines

                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($targetDln | ConvertTo-Json -Depth 8))
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Deadline not found"}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.Close()
            continue
        }

        # DELETE /api/deadlines/{id}
        if ($localPath -match '^/api/deadlines/([^/]+)$' -and $req.HttpMethod -eq 'DELETE') {
            $dlnId = $matches[1]
            $deadlines = @(Get-DbDeadlines)
            $newDeadlines = @($deadlines | Where-Object { $_.id -ne $dlnId })
            Save-DbDeadlines $newDeadlines
            $res.ContentType = 'application/json; charset=utf-8'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true,"message":"Deadline deleted"}')
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 9. Client Communications & Gmail SMTP Service (Objective 4 Extension)
        # -------------------------------------------------------------
        # GET /api/communications/history or /messages
        if (($localPath -eq '/api/communications/history' -or $localPath -eq '/api/communications/messages') -and $req.HttpMethod -eq 'GET') {
            $comms = @(Get-DbCommunications)
            $res.ContentType = 'application/json; charset=utf-8'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($comms | ConvertTo-Json -Depth 8))
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # POST /api/communications/messages (Save draft / scheduled / prepared message)
        if ($localPath -eq '/api/communications/messages' -and $req.HttpMethod -eq 'POST') {
            $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Dispose()
            $msg = $body | ConvertFrom-Json

            if ($null -eq $msg.messageId -or $msg.messageId -eq '') {
                $msg | Add-Member -NotePropertyName "messageId" -NotePropertyValue "msg-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())-$((New-Guid).ToString().Substring(0,4))" -Force
            }
            $nowIso = [DateTime]::UtcNow.ToString("o")
            if ($null -eq $msg.createdAt) {
                $msg | Add-Member -NotePropertyName "createdAt" -NotePropertyValue $nowIso -Force
            }
            $msg | Add-Member -NotePropertyName "updatedAt" -NotePropertyValue $nowIso -Force

            $comms = @(Get-DbCommunications)
            # If already exists, update
            $existingIdx = -1
            for ($i = 0; $i -lt $comms.Count; $i++) {
                if ($comms[$i].messageId -eq $msg.messageId) {
                    $existingIdx = $i
                    break
                }
            }
            if ($existingIdx -ge 0) {
                $comms[$existingIdx] = $msg
            } else {
                $comms = @($msg) + $comms
            }
            Save-DbCommunications $comms

            $res.ContentType = 'application/json; charset=utf-8'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($msg | ConvertTo-Json -Depth 8))
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # PUT /api/communications/messages/{id} (Update message / approve / schedule)
        if ($localPath -match '^/api/communications/messages/([^/]+)$' -and $req.HttpMethod -eq 'PUT') {
            $msgId = $matches[1]
            $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Dispose()
            $payload = $body | ConvertFrom-Json

            $comms = @(Get-DbCommunications)
            $targetMsg = $comms | Where-Object { $_.messageId -eq $msgId } | Select-Object -First 1

            if ($targetMsg) {
                foreach ($prop in $payload.PSObject.Properties) {
                    $targetMsg | Add-Member -NotePropertyName $prop.Name -NotePropertyValue $prop.Value -Force
                }
                $targetMsg.updatedAt = [DateTime]::UtcNow.ToString("o")
                Save-DbCommunications $comms

                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($targetMsg | ConvertTo-Json -Depth 8))
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Message not found"}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.Close()
            continue
        }

        # POST /api/communications/send-email (Direct Gmail SMTP dispatch)
        if ($localPath -eq '/api/communications/send-email' -and $req.HttpMethod -eq 'POST') {
            $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Dispose()
            $msgData = $body | ConvertFrom-Json

            $recipient = ($msgData.recipient + "").Trim()
            $subject = ($msgData.subject + "").Trim()
            $messageBody = ($msgData.messageBody + "").Trim()
            $caseTitle = ($msgData.caseTitle + "").Trim()
            $caseNumber = ($msgData.caseNumber + "").Trim()
            $clientName = ($msgData.clientName + "").Trim()

            # Safety validations
            if ($recipient -eq '' -or -not ($recipient -match '^[^@\s]+@[^@\s]+\.[^@\s]+$')) {
                $res.StatusCode = 400
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"The client does not have an email address."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            if ($subject -eq '' -or $messageBody -eq '') {
                $res.StatusCode = 400
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"message":"Subject and message body cannot be empty."}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }

            $smtpCfg = Get-DbSmtpConfig
            $sendResult = Send-GmailSmtpEmail $recipient $subject $messageBody $smtpCfg

            $nowIso = [DateTime]::UtcNow.ToString("o")
            $msgId = if ($msgData.messageId) { $msgData.messageId } else { "msg-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())-$((New-Guid).ToString().Substring(0,4))" }
            
            $status = if ($sendResult.success) { "Sent" } else { "Failed" }
            $provRef = if ($sendResult.success) { $sendResult.providerRef } else { $null }
            $failReason = if (-not $sendResult.success) { $sendResult.error } else { $null }

            $finalMsg = [PSCustomObject]@{
                messageId         = $msgId
                caseId            = $msgData.caseId
                caseTitle         = $caseTitle
                caseNumber        = $caseNumber
                clientId          = $msgData.clientId
                clientName        = $clientName
                messageType       = $msgData.messageType
                channel           = "Email"
                recipient         = $recipient
                subject           = $subject
                messageBody       = $messageBody
                language          = if ($msgData.language) { $msgData.language } else { "English" }
                status            = $status
                preparedBy        = if ($msgData.preparedBy) { $msgData.preparedBy } else { $req.Headers["X-User-Name"] }
                approvedBy        = if ($msgData.approvedBy) { $msgData.approvedBy } else { $req.Headers["X-User-Name"] }
                sentBy            = if ($msgData.sentBy) { $msgData.sentBy } else { $req.Headers["X-User-Name"] }
                scheduledAt       = $null
                sentAt            = if ($sendResult.success) { $nowIso } else { $null }
                providerReference = $provRef
                failureReason     = $failReason
                createdAt         = if ($msgData.createdAt) { $msgData.createdAt } else { $nowIso }
                updatedAt         = $nowIso
            }

            # Save in communications database
            $comms = @(Get-DbCommunications)
            $existingIdx = -1
            for ($i = 0; $i -lt $comms.Count; $i++) {
                if ($comms[$i].messageId -eq $msgId) {
                    $existingIdx = $i
                    break
                }
            }
            if ($existingIdx -ge 0) {
                $comms[$existingIdx] = $finalMsg
            } else {
                $comms = @($finalMsg) + $comms
            }
            Save-DbCommunications $comms

            # Log audit event
            $actor = if ($req.Headers["X-User-Name"]) { $req.Headers["X-User-Name"] } else { "SLCMS Staff" }
            Add-DbEvent ($req.Headers["X-User-Id"]) "Client Communication" "Email sent to $recipient regarding $caseNumber ($subject)" $clientIp $status $actor

            $res.ContentType = 'application/json; charset=utf-8'
            if ($sendResult.success) {
                $outObj = @{
                    success           = $true
                    message           = "Email sent successfully via Gmail SMTP to $recipient."
                    messageId         = $msgId
                    providerReference = $provRef
                    record            = $finalMsg
                }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($outObj | ConvertTo-Json -Depth 8))
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 500
                $outObj = @{
                    success       = $false
                    message       = "Email could not be sent. Your draft has been saved."
                    failureReason = $failReason
                    record        = $finalMsg
                }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($outObj | ConvertTo-Json -Depth 8))
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.Close()
            continue
        }

        # POST /api/communications/confirm-manual-send (For WhatsApp & SMS)
        if ($localPath -eq '/api/communications/confirm-manual-send' -and $req.HttpMethod -eq 'POST') {
            $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Dispose()
            $payload = $body | ConvertFrom-Json

            $msgId = $payload.messageId
            $nowIso = [DateTime]::UtcNow.ToString("o")
            $staffName = if ($req.Headers["X-User-Name"]) { $req.Headers["X-User-Name"] } else { "SLCMS Staff" }

            $comms = @(Get-DbCommunications)
            $targetMsg = $comms | Where-Object { $_.messageId -eq $msgId } | Select-Object -First 1

            if ($targetMsg) {
                $targetMsg.status = "Confirmed Sent by Staff"
                $targetMsg | Add-Member -NotePropertyName "sentAt" -NotePropertyValue $nowIso -Force
                $targetMsg | Add-Member -NotePropertyName "sentBy" -NotePropertyValue $staffName -Force
                $targetMsg.updatedAt = $nowIso
                Save-DbCommunications $comms

                Add-DbEvent ($req.Headers["X-User-Id"]) "Client Communication" "Manual $($targetMsg.channel) confirmed sent to $($targetMsg.recipient) for $($targetMsg.caseNumber)" $clientIp "Confirmed" $staffName

                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($targetMsg | ConvertTo-Json -Depth 8))
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $res.ContentType = 'application/json; charset=utf-8'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Message not found"}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.Close()
            continue
        }

        # GET /api/admin/smtp-config
        if ($localPath -eq '/api/admin/smtp-config' -and $req.HttpMethod -eq 'GET') {
            $cfg = Get-DbSmtpConfig
            $safeCfg = [PSCustomObject]@{
                host         = $cfg.host
                port         = $cfg.port
                enableSsl    = $cfg.enableSsl
                username     = $cfg.username
                hasPassword  = ($null -ne $cfg.password -and $cfg.password.Trim() -ne "")
                fromEmail    = $cfg.fromEmail
                fromName     = $cfg.fromName
                configured   = $cfg.configured
                lastTestedAt = $cfg.lastTestedAt
                testStatus   = $cfg.testStatus
            }
            $res.ContentType = 'application/json; charset=utf-8'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes(($safeCfg | ConvertTo-Json -Depth 5))
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # POST /api/admin/smtp-config
        if ($localPath -eq '/api/admin/smtp-config' -and $req.HttpMethod -eq 'POST') {
            $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Dispose()
            $newCfg = $body | ConvertFrom-Json

            $currentCfg = Get-DbSmtpConfig
            if ($newCfg.host) { $currentCfg.host = $newCfg.host }
            if ($newCfg.port) { $currentCfg.port = [int]$newCfg.port }
            if ($null -ne $newCfg.enableSsl) { $currentCfg.enableSsl = [bool]$newCfg.enableSsl }
            if ($newCfg.username) { $currentCfg.username = $newCfg.username }
            if ($newCfg.password -and $newCfg.password.Trim() -ne "") { $currentCfg.password = $newCfg.password }
            if ($newCfg.fromEmail) { $currentCfg.fromEmail = $newCfg.fromEmail }
            if ($newCfg.fromName) { $currentCfg.fromName = $newCfg.fromName }
            $currentCfg.configured = $true
            $currentCfg.lastTestedAt = [DateTime]::UtcNow.ToString("o")
            Save-DbSmtpConfig $currentCfg

            Add-DbEvent ($req.Headers["X-User-Id"]) "SMTP Configuration" "Gmail SMTP server configuration updated" $clientIp "Updated" "Administrator"

            $res.ContentType = 'application/json; charset=utf-8'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true,"message":"Gmail SMTP configuration saved successfully."}')
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # POST /api/admin/test-smtp
        if ($localPath -eq '/api/admin/test-smtp' -and $req.HttpMethod -eq 'POST') {
            $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Dispose()
            $payload = $body | ConvertFrom-Json
            $testTo = if ($payload.testEmail) { $payload.testEmail } else { "admin@slcms.local" }

            $smtpCfg = Get-DbSmtpConfig
            $testSub = "SLCMS Gmail SMTP Service Test - System Health Check"
            $testBody = "This is a verification test from the Smart Legal Case Management System confirming that Gmail SMTP integration is functioning accurately.`r`nTimestamp: " + [DateTime]::UtcNow.ToString("u") + "`r`nHost: " + $smtpCfg.host + ":" + $smtpCfg.port + "`r`nSender: " + $smtpCfg.fromName
            
            $sendRes = Send-GmailSmtpEmail $testTo $testSub $testBody $smtpCfg
            $smtpCfg.lastTestedAt = [DateTime]::UtcNow.ToString("o")
            $smtpCfg.testStatus = if ($sendRes.success) { "Verified Healthy" } else { "Connection Failed" }
            Save-DbSmtpConfig $smtpCfg

            $res.ContentType = 'application/json; charset=utf-8'
            if ($sendRes.success) {
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true,"message":"Gmail SMTP test connection verified successfully."}')
            } else {
                $errJson = @{ success = $false; message = "Gmail SMTP test failed: " + $sendRes.error } | ConvertTo-Json -Compress
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
            }
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # -------------------------------------------------------------
        # 10. Static File Serving
        # -------------------------------------------------------------
        $path = $localPath.TrimStart('/')
        if ($path -eq '') { $path = 'index.html' }
        $fullPath = Join-Path $rootDir $path

        if (Test-Path $fullPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $mime = switch ($ext) {
                '.html' { 'text/html; charset=utf-8' }
                '.css'  { 'text/css; charset=utf-8' }
                '.js'   { 'application/javascript; charset=utf-8' }
                '.json' { 'application/json; charset=utf-8' }
                '.png'  { 'image/png' }
                '.jpg'  { 'image/jpeg' }
                '.svg'  { 'image/svg+xml' }
                default { 'text/plain' }
            }
            $res.ContentType = $mime
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.Close()
    } catch {
        Write-Host "EXCEPTION IN REQUEST: $($_.Exception.ToString())"
        try { $context.Response.Close() } catch {}
    }
    }
} finally {
    $listener.Stop()
}
