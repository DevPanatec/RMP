import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Satellite, Loader, Check, X } from '../Icons';

// Decodifica VIN cascade: NHTSA vPIC (gratis US Class 4-8) → Vincario (€0.22 global).
// Vincario solo se invoca si NHTSA no devuelve make/model (probablemente no-US-spec).
export default function VinDecoder({ onDecoded, disabled }) {
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [decoded, setDecoded] = useState(null);
  const [source, setSource] = useState(null);
  const decodeNhtsa = useAction(api["integrations/nhtsaVpic"].decodeVin);
  const decodeVincario = useAction(api["integrations/vincario"].decodeVin);

  const handleDecode = async () => {
    if (!vin || vin.length < 11) {
      setError('VIN debe tener al menos 11 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    setSource(null);
    try {
      // Tier 1: NHTSA gratis
      const nhtsaResult = await decodeNhtsa({ vin });
      if (nhtsaResult.ok && nhtsaResult.data.make) {
        setDecoded(nhtsaResult.data);
        setSource('NHTSA vPIC (gratis)');
        onDecoded?.(nhtsaResult.data);
        return;
      }
      // Tier 2: Vincario fallback global (paga, free tier 3/mes)
      if (vin.length === 17) {
        const vincarioResult = await decodeVincario({ vin });
        if (vincarioResult.ok && vincarioResult.data.make) {
          setDecoded(vincarioResult.data);
          setSource(`Vincario (global${vincarioResult.data.balance_remaining != null ? ` · ${vincarioResult.data.balance_remaining} restantes` : ''})`);
          onDecoded?.(vincarioResult.data);
          return;
        }
        setError(`NHTSA: ${nhtsaResult.error ?? 'no match'}. Vincario: ${vincarioResult.error ?? 'no match'}`);
      } else {
        setError(nhtsaResult.error ?? 'NHTSA no match. VIN debe tener 17 chars para Vincario fallback.');
      }
      setDecoded(null);
    } catch (err) {
      setError(`Error: ${err.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vin-decoder">
      <div className="vin-decoder__input-group">
        <input
          type="text"
          value={vin}
          onChange={e => setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17))}
          placeholder="VIN (17 caracteres) — opcional"
          maxLength={17}
          disabled={disabled || loading}
          className="vin-decoder__input"
        />
        <button
          type="button"
          className="vin-decoder__btn"
          onClick={handleDecode}
          disabled={disabled || loading || vin.length < 11}
          title="Decodificar VIN gratis via NHTSA"
        >
          {loading ? <Loader size={14} className="spin" /> : <Satellite size={14} />}
          <span>{loading ? 'Decodificando…' : 'Decodificar VIN'}</span>
        </button>
      </div>
      {error && (
        <div className="vin-decoder__error">
          <X size={12} /> {error}
        </div>
      )}
      {decoded && (
        <div className="vin-decoder__success">
          <Check size={12} /> {decoded.make} {decoded.model} {decoded.year}
          {decoded.engineModel && ` · ${decoded.engineModel}`}
          {source && <small style={{ marginLeft: 6, opacity: 0.7 }}>· {source}</small>}
        </div>
      )}
      <small className="vin-decoder__hint">
        Cascade: NHTSA vPIC (gratis, US) → Vincario (€0.22, global) si no match.
      </small>
    </div>
  );
}
