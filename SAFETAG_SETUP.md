# 📡 SafeTag GPS Integration - Technical Documentation

## 🎯 Overview

RMP integrates with SafeTag GPS tracking platform to provide real-time vehicle location monitoring without requiring direct GPS hardware configuration.

---

## ✅ What's Configured

### Backend Integration (`convex/safetag.ts`)
- ✅ **fetchDevices** - Retrieves all GPS devices from SafeTag API
- ✅ **syncAllVehicles** - Syncs all vehicles with SafeTag GPS data
- ✅ **updateVehicleFromSafeTag** - Updates individual vehicle GPS data
- ✅ **getVehiclesWithSafeTag** - Query vehicles with SafeTag enabled
- ✅ **getSyncStatus** - Get real-time sync status of all vehicles
- ✅ **linkDeviceToVehicle** - Link SafeTag GPS device to RMP vehicle

### Automatic Sync (`convex/crons.ts`)
- ✅ **Cron job** running every 1 minute
- ✅ Automatically syncs GPS positions from SafeTag → Convex → Frontend
- ✅ Updates: position, speed, heading, battery, signal, online status

### Frontend Components
- ✅ **SafeTagSync** component (`src/components/SafeTag/SafeTagSync.jsx`)
- ✅ **useSafeTagSync** hook (`src/hooks/useSafeTagSync.js`)
- ✅ Integrated into **AdminDashboard** sidebar tab

### Database Schema (`convex/schema.ts`)
Extended `vehiculos` table with SafeTag fields:
```typescript
safetag_device_id: v.optional(v.string()), // GPS IMEI
safetag_device_name: v.optional(v.string()), // GPS friendly name
gps_bateria: v.optional(v.number()), // Battery %
gps_senal: v.optional(v.number()), // GSM signal
gps_en_linea: v.optional(v.boolean()), // Online status
```

---

## 🔑 API Configuration

### Environment Variables Required

**.env.local** (local development):
```env
SAFETAG_API_KEY=stkey_QMvbocqGdsUc92YVMxi0J7NKjOaFViUf_...
SAFETAG_USERNAME=dev@panatec.systems
```

**Convex Environment** (production):
```bash
npx convex env set SAFETAG_API_KEY "stkey_..."
npx convex env set SAFETAG_USERNAME "dev@panatec.systems"
```

### API Authentication

**⚠️ IMPORTANT**: SafeTag API requires `x-api-key` header (lowercase with hyphen), NOT `API-Key`

**Correct**:
```javascript
headers: {
  "x-api-key": apiKey,
  "Content-Type": "application/json"
}
```

**Incorrect** ❌:
```javascript
headers: {
  "API-Key": apiKey  // This returns "Error: Missing params."
}
```

---

## 📊 SafeTag API Response Format

### Endpoint
```
GET https://api.safetagtracking.com/api/v1/devices/{username}
```

### Response Structure
```json
[
  {
    "_id": "357956371545858",
    "model": 11,
    "product": 4,
    "owner": {
      "id": "6932f0c68ed7209bf75ad380",
      "username": "dev@panatec.systems"
    },
    "prefs": {
      "name": "GPS 1",
      "category": "default",
      "marker": "default",
      "speed_limit": 0,
      "alerts": { ... }
    },
    "status": {
      "coords": {
        "lat": 8.993237777777777,
        "lon": -79.50188666666666
      },
      "location": "8.9932377777,-79.50188666",
      "speed": 0,
      "course": 84,
      "battery": 6,
      "signal": 60,
      "last_updated": "2025-12-05T17:00:07.000Z",
      "charge": true,
      "geofence": true,
      "status": 11
    },
    "subscription": {
      "status": "active",
      "trialing": true,
      "trial_days": 7
    }
  }
]
```

### Key Fields Mapped to RMP

| SafeTag API Field | RMP Database Field | Description |
|-------------------|-------------------|-------------|
| `_id` | `safetag_device_id` | GPS IMEI (15 digits) |
| `prefs.name` | `safetag_device_name` | Friendly device name |
| `status.coords.lat` | `gps_latitud` | Latitude |
| `status.coords.lon` | `gps_longitud` | Longitude |
| `status.speed` | `gps_velocidad` | Speed in km/h |
| `status.course` | `gps_rumbo` | Heading (0-359°) |
| `status.battery` | `gps_bateria` | Battery % |
| `status.signal` | `gps_senal` | GSM signal strength |
| `status.last_updated` | `gps_ultima_actualizacion` | ISO timestamp → Unix timestamp |

---

## 🔄 How Sync Works

### Automatic Sync (Every 10 Seconds)

1. **Cron job triggers** `safetag:syncAllVehicles` every 10 seconds
2. **Fetch devices** from SafeTag API via `fetchDevices` action
3. **Get vehicles** with `safetag_device_id` configured in RMP
4. **Match devices** by IMEI (`_id` from SafeTag = `safetag_device_id` in RMP)
5. **Update vehicles** with latest GPS data via `updateVehicleFromSafeTag` mutation
6. **Real-time UI update** via Convex subscriptions

### 🔥 IMPORTANT: Timestamp Fix

**Problem**: SafeTag's `last_updated` field does NOT update on every position change. It only updates on "significant events" (stops, state changes, alerts), meaning the vehicle can move continuously for minutes with the SAME timestamp.

**Solution**: We use `Date.now()` as the timestamp when WE receive the data, instead of trusting SafeTag's `last_updated`. This ensures:
- ✅ Every GPS update has a unique, sequential timestamp
- ✅ Playback works correctly without duplicate timestamps
- ✅ Real-time tracking shows smooth movement
- ✅ Historical data is ordered correctly

The original SafeTag timestamp is still saved in `safetag_timestamp` field for debugging/comparison purposes.

### Manual Sync (User-Triggered)

1. User clicks **"Sincronizar Ahora"** button in SafeTag GPS tab
2. Calls `syncAllVehicles` action immediately
3. Shows loading state during sync
4. Displays updated vehicle status cards

---

## 🚗 Test Vehicle Created

### Vehicle Details
- **Placa**: GPS-TEST-001
- **Marca**: Chevrolet
- **Modelo**: NPR
- **Año**: 2023
- **Tipo Servicio**: recoleccion
- **SafeTag Device ID**: 357956371545858
- **SafeTag Device Name**: GPS 1

### Current GPS Status (as of Dec 5, 2025)
- 📍 **Position**: 8.9932°N, 79.5019°W (Panama City)
- 🚗 **Speed**: 0 km/h (parked)
- 🧭 **Heading**: 84° (East)
- 🔋 **Battery**: 6%
- 📶 **Signal**: 60%
- 🟢 **Status**: Online
- ⏰ **Last Update**: Dec 5, 2025 5:00 PM

---

## 📋 Usage Guide

### For Administrators

#### 1. Link GPS to Vehicle
```javascript
// Via Convex CLI
npx convex run safetag:linkDeviceToVehicle \
  --vehiculoId "m172zn3g6g2c6aqt27chrcyqe97wp766" \
  --safetagDeviceId "357956371545858" \
  --deviceName "GPS Principal"
```

#### 2. Manual Sync
```javascript
// Sync all vehicles now
npx convex run safetag:syncAllVehicles
```

#### 3. Check Sync Status
```javascript
// Get current status of all SafeTag vehicles
npx convex run safetag:getSyncStatus
```

### For Frontend Integration

```javascript
import { useSafeTagSync } from '../../hooks/useSafeTagSync';

const MyComponent = () => {
  const { sync, syncing, error, status } = useSafeTagSync();

  return (
    <div>
      <button onClick={sync} disabled={syncing}>
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {status?.map((vehicle) => (
        <div key={vehicle.vehiculoId}>
          <h3>{vehicle.placa}</h3>
          <p>Position: {vehicle.posicion.lat}, {vehicle.posicion.lng}</p>
          <p>Speed: {vehicle.velocidad} km/h</p>
          <span className={vehicle.enLinea ? 'online' : 'offline'}>
            {vehicle.enLinea ? 'Online' : 'Offline'}
          </span>
        </div>
      ))}
    </div>
  );
};
```

---

## 🐛 Troubleshooting

### Problem: "Error: Missing params."

**Cause**: Using wrong API header name
**Solution**: Use `x-api-key` (lowercase with hyphen), not `API-Key`

### Problem: No devices returned (empty array)

**Cause**: Wrong endpoint or authentication
**Solution**:
1. Verify API key is correct
2. Verify username matches SafeTag account
3. Check endpoint: `/api/v1/devices/{username}`

### Problem: GPS shows offline

**Possible causes**:
1. Vehicle GPS device is powered off
2. SafeTag subscription expired
3. GPS lost signal
4. Last update > 5 minutes ago

**Solution**:
1. Check GPS device status in SafeTag app
2. Verify subscription is active
3. Move vehicle to open area for GPS signal
4. Run manual sync: `npx convex run safetag:syncAllVehicles`

### Problem: Coordinates validation error

**Error**: `Value does not match validator. Path: .deviceData.latitude`
**Cause**: Using `status.location` (string) instead of `status.coords.lat` (number)
**Solution**: Always use `device.status.coords.lat` and `device.status.coords.lon`

---

## 📚 Related Files

### Backend
- `convex/safetag.ts` - Main SafeTag integration module
- `convex/crons.ts` - Automatic sync cron job
- `convex/schema.ts` - Database schema with SafeTag fields
- `convex/testSafeTagAPI*.ts` - Testing utilities

### Frontend
- `src/components/SafeTag/SafeTagSync.jsx` - Main dashboard component
- `src/components/SafeTag/SafeTagSync.css` - Styles
- `src/hooks/useSafeTagSync.js` - React hook for SafeTag sync
- `src/pages/AdminDashboard/AdminDashboard.jsx` - Integration point

### Documentation
- `GPS_SETUP.md` - General GPS setup guide (includes SafeTag)
- `SAFETAG_SETUP.md` - This file (technical details)

---

## 🔐 Security Notes

- ✅ API keys stored in environment variables (never committed to git)
- ✅ Convex environment variables encrypted at rest
- ✅ HTTPS-only communication with SafeTag API
- ✅ No GPS data stored in frontend (only Convex database)
- ✅ Real-time subscriptions via secure WebSocket

---

## ✅ Success Criteria

- [x] SafeTag API integration working (correct header: `x-api-key`)
- [x] Test vehicle created (GPS-TEST-001)
- [x] Manual sync working
- [x] Cron job configured (every 1 minute)
- [x] GPS data updating in database
- [x] Frontend component showing live GPS status
- [x] Online/offline status indicators
- [x] Battery and signal strength monitoring

---

**Status**: ✅ **FULLY OPERATIONAL**
**Last Updated**: December 5, 2025
**Version**: 1.0.0
