import { createContext, useContext, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const RRHHContext = createContext();

export const RRHHProvider = ({ children }) => {
  const contratosData = useQuery(api.rrhh.contratos.list, {});
  const adendasData = useQuery(api.rrhh.adendas.list, {});

  const createContratoMut = useMutation(api.rrhh.contratos.create);
  const updateContratoMut = useMutation(api.rrhh.contratos.update);
  const rescindirContratoMut = useMutation(api.rrhh.contratos.rescindir);

  const createAdendaMut = useMutation(api.rrhh.adendas.create);
  const removeAdendaMut = useMutation(api.rrhh.adendas.remove);

  const contratos = contratosData || [];
  const adendas = adendasData || [];
  const loading = contratosData === undefined || adendasData === undefined;

  const wrap = (mut) => async (args) => {
    try {
      const result = await mut(args);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const value = useMemo(
    () => ({
      contratos,
      adendas,
      loading,
      createContrato: wrap(createContratoMut),
      updateContrato: wrap(updateContratoMut),
      rescindirContrato: wrap(rescindirContratoMut),
      createAdenda: wrap(createAdendaMut),
      removeAdenda: wrap(removeAdendaMut),
    }),
    [contratos, adendas, loading],
  );

  return <RRHHContext.Provider value={value}>{children}</RRHHContext.Provider>;
};

export const useRRHH = () => {
  const ctx = useContext(RRHHContext);
  if (!ctx) throw new Error('useRRHH must be used within RRHHProvider');
  return ctx;
};

export default RRHHContext;
