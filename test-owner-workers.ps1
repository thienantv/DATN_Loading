$ErrorActionPreference = 'Stop'

$headers = @{ 'Content-Type' = 'application/json' }

# Login as admin
$loginBody = @{ username = 'admin'; password = 'admin123' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method Post -Headers $headers -Body $loginBody
$authHeaders = @{ 'Content-Type' = 'application/json'; 'Authorization' = "Bearer $($login.token)" }

# Create owner with new farm
$suffix = Get-Random -Minimum 1000 -Maximum 9999
$ownerUser = "owner$suffix"
$ownerBody = @{ 
    fullName = 'Owner Test'
    username = $ownerUser
    email = "$ownerUser@example.com"
    phone = '0900000001'
    role = 'OWNER'
    password = 'Temp123456'
    farmName = "Trai $suffix"
} | ConvertTo-Json
$owner = Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/users' -Method Post -Headers $authHeaders -Body $ownerBody
$ownerFarmId = $owner.data.farm_id

# Create worker in the SAME farm
$workerUser = "worker$suffix"
$workerBody = @{ 
    fullName = 'Worker Test'
    username = $workerUser
    email = "$workerUser@example.com"
    phone = '0900000002'
    role = 'WORKER'
    password = 'Temp123456'
    farmId = $ownerFarmId
} | ConvertTo-Json
$worker = Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/users' -Method Post -Headers $authHeaders -Body $workerBody

# Login as owner
$ownerLoginBody = @{ username = $ownerUser; password = 'Temp123456' } | ConvertTo-Json
$ownerLogin = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method Post -Headers $headers -Body $ownerLoginBody
$ownerAuthHeaders = @{ 'Content-Type' = 'application/json'; 'Authorization' = "Bearer $($ownerLogin.token)" }

# Fetch workers visible to owner
$workers = Invoke-RestMethod -Uri 'http://localhost:3000/api/users/workers' -Method Get -Headers $ownerAuthHeaders

# Show results
[pscustomobject]@{ 
    ownerFarmId = $ownerFarmId
    workerFarmId = $worker.data.farm_id
    workersVisibleToOwner = @($workers.data).Count
    workersList = $workers.data | Select-Object user_id, username, farm_id
} | ConvertTo-Json -Depth 10
