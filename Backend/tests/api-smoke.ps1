$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$base = 'http://localhost/MA%20Hiram/Backend/public/api'

function Call($method, $path, $body = $null, $token = $null) {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }

    $params = @{
        Uri             = "$base$path"
        Method          = $method
        Headers         = $headers
        ContentType     = 'application/json'
        UseBasicParsing = $true
    }
    if ($null -ne $body) { $params['Body'] = ($body | ConvertTo-Json -Compress -Depth 8) }

    try {
        $r = Invoke-WebRequest @params
        $content = $r.Content
        $status = [int]$r.StatusCode
    } catch {
        $resp = $_.Exception.Response
        if ($null -eq $resp) { return @{ s = 0; b = $_.Exception.Message } }
        $reader = New-Object IO.StreamReader($resp.GetResponseStream())
        $content = $reader.ReadToEnd()
        $status = [int]$resp.StatusCode
    }

    try { return @{ s = $status; b = ($content | ConvertFrom-Json) } }
    catch { return @{ s = $status; b = $content } }
}

function Show($label, $result) {
    $json = ($result.b | ConvertTo-Json -Compress -Depth 8)
    if ($json.Length -gt 300) { $json = $json.Substring(0, 300) + ' ...' }
    Write-Output ("{0,-26} {1}  {2}" -f $label, $result.s, $json)
}

Write-Output '=== AUTH ==='
$email = 'user' + (Get-Random -Maximum 99999) + '@hiram.app'
$reg = Call 'POST' '/auth/register' @{ name = 'Test User'; email = $email; password = 'secret123'; currency = 'PHP' }
Show 'register' $reg
$token = $reg.b.data.token

Show 'register duplicate' (Call 'POST' '/auth/register' @{ name = 'Test'; email = $email; password = 'secret123' })
Show 'login' (Call 'POST' '/auth/login' @{ email = $email; password = 'secret123' })
Show 'login bad password' (Call 'POST' '/auth/login' @{ email = $email; password = 'WRONGpassword' })
Show 'register invalid input' (Call 'POST' '/auth/register' @{ name = 'A'; email = 'notanemail'; password = '1' })
Show 'me (auth)' (Call 'GET' '/auth/me' $null $token)
Show 'me (no token)' (Call 'GET' '/auth/me')
Show 'me (bad token)' (Call 'GET' '/auth/me' $null 'deadbeefdeadbeef')

Write-Output ''
Write-Output '=== DEBTORS ==='
$debtor = Call 'POST' '/debtors' @{ name = 'Nena Villanueva'; phone = '0900 111 2233'; note = 'Utang sa tindahan' } $token
Show 'create debtor' $debtor
$debtorId = $debtor.b.data.id

Show 'create debtor invalid' (Call 'POST' '/debtors' @{ name = 'X' } $token)
Show 'search debtors' (Call 'GET' '/debtors?q=Nena' $null $token)
Show 'get debtor' (Call 'GET' "/debtors/$debtorId" $null $token)
Show 'update debtor' (Call 'PUT' "/debtors/$debtorId" @{ phone = '0900 999 8877' } $token)
Show 'get debtor 999999' (Call 'GET' '/debtors/999999' $null $token)

Write-Output ''
Write-Output '=== DEBTS ==='
$debt = Call 'POST' '/debts' @{ debtorId = $debtorId; amount = '2500.50'; dueDate = '2026-09-30'; note = 'Bigas at asukal' } $token
Show 'create debt' $debt
$debtId = $debt.b.data.id

Show 'create debt new name' (Call 'POST' '/debts' @{ debtorName = 'Rolling New Guy'; amount = 300 } $token)
Show 'create debt negative' (Call 'POST' '/debts' @{ debtorId = $debtorId; amount = '-50' } $token)
Show 'create debt zero' (Call 'POST' '/debts' @{ debtorId = $debtorId; amount = 0 } $token)
Show 'create debt bad date' (Call 'POST' '/debts' @{ debtorId = $debtorId; amount = 100; dueDate = '2026-02-31' } $token)
Show 'create debt no debtor' (Call 'POST' '/debts' @{ amount = 100 } $token)
Show 'list debts' (Call 'GET' '/debts' $null $token)
Show 'list pending' (Call 'GET' '/debts?status=pending' $null $token)
Show 'list sort amount_high' (Call 'GET' '/debts?sort=amount_high' $null $token)
Show 'get debt detail' (Call 'GET' "/debts/$debtId" $null $token)
Show 'update debt' (Call 'PUT' "/debts/$debtId" @{ note = 'updated note'; dueDate = '2026-10-15' } $token)

Write-Output ''
Write-Output '=== PAYMENTS ==='
$pay = Call 'POST' "/debts/$debtId/payments" @{ amount = '500.50'; method = 'gcash'; paidAt = '2026-09-10T08:30:00Z'; note = 'Unang bahagi' } $token
Show 'pay 500.50' $pay
Write-Output ("     -> debt now: status={0} paid={1} balance={2}" -f $pay.b.data.debt.status, $pay.b.data.debt.paidAmount, $pay.b.data.debt.balance)

$over = Call 'POST' "/debts/$debtId/payments" @{ amount = '99999' } $token
Show 'overpay rejected' $over

$second = Call 'POST' "/debts/$debtId/payments" @{ amount = '2000' } $token
Show 'pay the rest' $second
Write-Output ("     -> debt now: status={0} balance={1}" -f $second.b.data.debt.status, $second.b.data.debt.balance)

Show 'pay settled debt' (Call 'POST' "/debts/$debtId/payments" @{ amount = 10 } $token)
Show 'bad method rejected' (Call 'POST' "/debts/$debtId/payments" @{ amount = 10; method = 'bitcoin' } $token)
Show 'pay unknown debt' (Call 'POST' '/debts/999999/payments' @{ amount = 10 } $token)
Show 'list payments' (Call 'GET' "/debts/$debtId/payments" $null $token)

$lower = Call 'PUT' "/debts/$debtId" @{ amount = '10' } $token
Show 'lower below paid (422)' $lower

$undo = Call 'DELETE' "/payments/$($second.b.data.payment.id)" $null $token
Show 'undo a payment' $undo
Write-Output ("     -> debt now: status={0} balance={1}" -f $undo.b.data.debt.status, $undo.b.data.debt.balance)

Write-Output ''
Write-Output '=== SETTLE / REOPEN ==='
$newDebt = Call 'POST' '/debts' @{ debtorId = $debtorId; amount = '800' } $token
Show 'settle in one tap' (Call 'POST' "/debts/$($newDebt.b.data.id)/settle" @{ method = 'cash' } $token)
Show 'reopen it' (Call 'POST' "/debts/$($newDebt.b.data.id)/reopen" $null $token)
Show 'delete that debt' (Call 'DELETE' "/debts/$($newDebt.b.data.id)" $null $token)

Write-Output ''
Write-Output '=== STATS + SYNC ==='
Show 'stats summary' (Call 'GET' '/stats/summary' $null $token)
$full = Call 'GET' '/sync' $null $token
Write-Output ("     -> sync: debtors={0} debts={1} payments={2}" -f $full.b.data.debtors.Count, $full.b.data.debts.Count, $full.b.data.payments.Count)
$delta = Call 'GET' '/sync?since=2020-01-01T00:00:00Z' $null $token
Write-Output ("     -> delta: debtors={0} debts={1} payments={2}" -f $delta.b.data.debtors.Count, $delta.b.data.debts.Count, $delta.b.data.payments.Count)

Write-Output ''
Write-Output '=== ROUTING ==='
Show 'unknown endpoint (404)' (Call 'GET' '/nope' $null $token)
Show 'wrong method (405)' (Call 'DELETE' '/auth/login' $null $token)
Show 'health' (Call 'GET' '/health')

Write-Output ''
Write-Output '=== SOFT DELETE ==='
$tmp = Call 'POST' '/debtors' @{ name = 'Temp Person' } $token
Call 'POST' '/debts' @{ debtorId = $tmp.b.data.id; amount = '100' } $token | Out-Null
$before = Call 'GET' '/stats/summary' $null $token
Show 'delete debtor' (Call 'DELETE' "/debtors/$($tmp.b.data.id)" $null $token)
$after = Call 'GET' '/stats/summary' $null $token
Write-Output ("     -> debtCount {0} -> {1}" -f $before.b.data.debtCount, $after.b.data.debtCount)

Write-Output ''
Write-Output '=== TENANT ISOLATION ==='
$other = Call 'POST' '/auth/register' @{ name = 'Other'; email = 'other' + (Get-Random -Maximum 99999) + '@hiram.app'; password = 'secret123' }
$otherToken = $other.b.data.token
Show 'other: empty debtors' (Call 'GET' '/debtors' $null $otherToken)
Show 'other: my debtor (404)' (Call 'GET' "/debtors/$debtorId" $null $otherToken)
Show 'other: pay my debt (404)' (Call 'POST' "/debts/$debtId/payments" @{ amount = 5 } $otherToken)

Write-Output ''
Write-Output '=== LOGOUT ==='
Show 'logout' (Call 'POST' '/auth/logout' $null $token)
Show 'me after logout (401)' (Call 'GET' '/auth/me' $null $token)

