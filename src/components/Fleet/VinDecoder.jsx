import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Satellite, Loader, Check, X } from '../Icons';

// Decodifica VIN via NHTSA vPIC (gratis, US Class 4-8 + buses + trailers).
// Si decode exitoso, llama onDecoded(data) con {make, model, year, ...}
export default function VinDecoder({ onDecoded, disabled }) {
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [decoded, setDecoded] = useState(null);
  const decode = useAction(api["integrations/nhtsaVpic"].decodeVin);

  const handleDecode = async () => {
    if (!vin || vin.length < 11) {
      setError('VIN debe tener al menos 11 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await decode({ vin });
      if (!result.ok) {
        setError(result.error);
        setDecoded(null);
      } else {
        setDecoded(result.data);
        onDecoded?.(result.data);
      }
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
        </div>
      )}
      <small className="vin-decoder__hint">
        Fuente: NHTSA vPIC (gratis). Cobertura: vehículos US Class 4-8, buses, trailers.
      </small>
    </div>
  );
}
