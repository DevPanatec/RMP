import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useOrganization } from '../../context/OrganizationContext';
import { useProject } from '../../context/ProjectContext';
import CronogramaHeader from './CronogramaHeader';
import CronogramaMetrics from './CronogramaMetrics';
import CronogramaGrid from './CronogramaGrid';
import CronogramaHeatmap from './CronogramaHeatmap';
import CronogramaYearHeatmap from './CronogramaYearHeatmap';
import CronogramaDayDetail from './CronogramaDayDetail';
import CronogramaAssignmentDetail from './CronogramaAssignmentDetail';
import CronogramaLegend from './CronogramaLegend';
import CronogramaSkeleton from './CronogramaSkeleton';
import RouteReportDetailModal from '../Reports/RouteReportDetailModal';
import MaintenanceReportDetailModal from '../Reports/MaintenanceReportDetailModal';
import CleaningReportDetailModal from '../Cleaning/ReportDetailModal';
import FumigationReportDetailModal from '../Fumigation/FumigationReportDetailModal';
import { Clock, Sparkles } from '../Icons';
import './Cronograma.css';

const MS_DAY = 86_400_000;

const startOfDay = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const getMondayOfWeek = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.getTime();
};

const startOfMonth = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
};

const endOfMonth = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
};

const startOfYear = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
};

const endOfYear = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
};

const addMonths = (ms, n) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime();
};

const addYears = (ms, n) => {
  const d = new Date(ms);
  return new Date(d.getFullYear() + n, d.getMonth(), 1).getTime();
};

const DEFAULT_FILTERS = { rec: true, lim: true, fum: true, mto: true };

const CronogramaComponent = ({ onNavigateToModule }) => {
  const { currentOrgId } = useOrganization();
  const { currentProjectId } = useProject();
  const [viewMode, setViewMode] = useState('month');
  const [anchorMs, setAnchorMs] = useState(() => Date.now());
  const [moduleFilters, setModuleFilters] = useState(DEFAULT_FILTERS);
  const [detailCell, setDetailCell] = useState(null);
  // selectedEvent: null | { event: CronogramaEvent } — drives modal routing
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (viewMode === 'week') {
      const start = getMondayOfWeek(anchorMs);
      return { rangeStart: start, rangeEnd: start + 7 * MS_DAY - 1 };
    }
    if (viewMode === 'year') {
      return { rangeStart: startOfYear(anchorMs), rangeEnd: endOfYear(anchorMs) };
    }
    return { rangeStart: startOfMonth(anchorMs), rangeEnd: endOfMonth(anchorMs) };
  }, [viewMode, anchorMs]);

  const activeModules = useMemo(
    () => Object.entries(moduleFilters).filter(([, v]) => v).map(([k]) => k),
    [moduleFilters]
  );

  const queryArgs = useMemo(() => {
    const base = {
      rangeStart,
      rangeEnd,
      organizacion_id: currentOrgId ?? undefined,
      proyecto_id: currentProjectId ?? undefined,
      modules: activeModules.length > 0 ? activeModules : undefined,
    };
    if (viewMode === 'week') return { ...base, mode: 'detail' };
    if (viewMode === 'year') return { ...base, mode: 'summary', bucket: 'month' };
    return { ...base, mode: 'summary', bucket: 'day' };
  }, [rangeStart, rangeEnd, viewMode, currentOrgId, currentProjectId, activeModules]);

  const queryResult = useQuery(api.cronograma.getRange, queryArgs);

  const detailDayRange = useMemo(() => {
    if (!detailCell) return null;
    const start = startOfDay(detailCell.dayMs);
    return { start, end: start + MS_DAY - 1 };
  }, [detailCell]);

  const detailQuery = useQuery(
    api.cronograma.getRange,
    detailDayRange
      ? {
          rangeStart: detailDayRange.start,
          rangeEnd: detailDayRange.end,
          mode: 'detail',
          organizacion_id: currentOrgId ?? undefined,
          proyecto_id: currentProjectId ?? undefined,
          modules: detailCell ? [detailCell.module] : undefined,
        }
      : 'skip'
  );

  // ============ Modal routing for completed events ============
  // Status alone isn't enough: an assignment with estado=completada also gets
  // status='completed' but its event.id is synthetic (not a real report _id).
  // Use metadata.source to discriminate: 'report' → open report modal;
  // 'assignment' (including those with status=completed) → open compact modal.
  const isReportEvent =
    selectedEvent?.event.status === 'completed' &&
    selectedEvent.event.metadata?.source === 'report';
  const selMod = selectedEvent?.event.module;

  const selectedRouteReport = useQuery(
    api.route_reports.getById,
    isReportEvent && selMod === 'rec'
      ? { id: selectedEvent.event.id }
      : 'skip'
  );

  const selectedCleaningAssignment = useQuery(
    api.cleaning.getAssignmentByIdEnriched,
    isReportEvent && selMod === 'lim' && selectedEvent.event.metadata?.assignment_id
      ? { id: selectedEvent.event.metadata.assignment_id }
      : 'skip'
  );

  const selectedFumigationAssignment = useQuery(
    api.fumigaciones.getById,
    isReportEvent && selMod === 'fum' && selectedEvent.event.metadata?.assignment_id
      ? { id: selectedEvent.event.metadata.assignment_id }
      : 'skip'
  );

  // Maintenance modal does its own fetch using initialReport._id
  const closeEventModal = () => setSelectedEvent(null);

  const handleEventClick = (event) => {
    setSelectedEvent({ event });
  };

  // Cleaning modal expects a transformed shape with rawAssignment + lugar + area as strings
  const cleaningReportShape = useMemo(() => {
    if (!selectedCleaningAssignment) return null;
    return {
      id: selectedCleaningAssignment._id,
      fecha: selectedCleaningAssignment.fecha,
      hora: selectedCleaningAssignment.hora,
      sala: selectedCleaningAssignment.lugar?.nombre || '',
      area: selectedCleaningAssignment.area?.nombre || '',
      rawAssignment: selectedCleaningAssignment,
    };
  }, [selectedCleaningAssignment]);

  const handlePrev = () =>
    setAnchorMs((ms) => {
      if (viewMode === 'week') return ms - 7 * MS_DAY;
      if (viewMode === 'year') return addYears(ms, -1);
      return addMonths(ms, -1);
    });

  const handleNext = () =>
    setAnchorMs((ms) => {
      if (viewMode === 'week') return ms + 7 * MS_DAY;
      if (viewMode === 'year') return addYears(ms, 1);
      return addMonths(ms, 1);
    });

  const handleToday = () => setAnchorMs(Date.now());

  const toggleModule = (mod) =>
    setModuleFilters((prev) => ({ ...prev, [mod]: !prev[mod] }));

  const handleViewModeChange = (mode) => setViewMode(mode);

  // Drill-down: year cell click → switch to month view at that month
  const handleYearMonthClick = (year, monthIndex) => {
    setAnchorMs(new Date(year, monthIndex, 1).getTime());
    setViewMode('month');
  };

  const loading = queryResult === undefined;

  const filteredEvents = useMemo(() => {
    if (queryResult?.mode !== 'detail') return [];
    return queryResult.events.filter((e) => moduleFilters[e.module]);
  }, [queryResult, moduleFilters]);

  const filteredSummary = useMemo(() => {
    if (queryResult?.mode !== 'summary') return [];
    return queryResult.summary.filter((s) => moduleFilters[s.module]);
  }, [queryResult, moduleFilters]);

  const viewTitle =
    viewMode === 'year' ? 'anual' : viewMode === 'month' ? 'mensual' : 'semanal';

  return (
    <div className="cronograma">
      <div className="cronograma__head">
        <div className="cronograma__title-row">
          <div className="cronograma__title-wrap">
            <div className="cronograma__title-glow" aria-hidden="true">
              <Clock size={22} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="cronograma__title">
                Cronograma {viewTitle}
                <Sparkles size={14} strokeWidth={2} className="cronograma__title-sparkle" />
              </h2>
              <p className="cronograma__subtitle">
                Vista unificada · pasado · presente · futuro
              </p>
            </div>
          </div>
        </div>
      </div>

      <CronogramaMetrics
        queryResult={queryResult}
        moduleFilters={moduleFilters}
        loading={loading}
      />

      <CronogramaHeader
        viewMode={viewMode}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        anchorMs={anchorMs}
        moduleFilters={moduleFilters}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onToggleModule={toggleModule}
        onViewModeChange={handleViewModeChange}
      />

      <div className={`cronograma__viewport cronograma__viewport--${viewMode}`} key={viewMode}>
        {loading ? (
          <CronogramaSkeleton viewMode={viewMode} />
        ) : viewMode === 'year' ? (
          <CronogramaYearHeatmap
            summary={filteredSummary}
            year={new Date(anchorMs).getFullYear()}
            activeModules={moduleFilters}
            onMonthClick={handleYearMonthClick}
          />
        ) : viewMode === 'month' ? (
          <CronogramaHeatmap
            summary={filteredSummary}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            activeModules={moduleFilters}
            onCellClick={(dayMs, module) => setDetailCell({ dayMs, module })}
          />
        ) : (
          <CronogramaGrid
            events={filteredEvents}
            weekStart={rangeStart}
            activeModules={moduleFilters}
            onCellClick={(dayMs, module) => setDetailCell({ dayMs, module })}
          />
        )}
      </div>

      <CronogramaLegend />

      {detailCell && (
        <CronogramaDayDetail
          dayMs={detailCell.dayMs}
          module={detailCell.module}
          events={detailQuery?.mode === 'detail' ? detailQuery.events : null}
          loading={detailQuery === undefined}
          onClose={() => setDetailCell(null)}
          onEventClick={handleEventClick}
        />
      )}

      {/* Assignment-sourced events (incl. those with estado=completada) → compact modal */}
      {selectedEvent && !isReportEvent && (
        <CronogramaAssignmentDetail
          event={selectedEvent.event}
          onClose={closeEventModal}
          onNavigateToModule={onNavigateToModule}
        />
      )}

      {/* Report-sourced events → reuse per-module detail modals */}
      {selectedEvent && isReportEvent && selMod === 'rec' && selectedRouteReport && (
        <RouteReportDetailModal
          report={selectedRouteReport}
          onClose={closeEventModal}
        />
      )}

      {selectedEvent && isReportEvent && selMod === 'mto' && (
        <MaintenanceReportDetailModal
          report={{ _id: selectedEvent.event.id }}
          onClose={closeEventModal}
        />
      )}

      {selectedEvent && isReportEvent && selMod === 'lim' && cleaningReportShape && (
        <CleaningReportDetailModal
          isOpen
          report={cleaningReportShape}
          location={selectedCleaningAssignment?.lugar}
          onClose={closeEventModal}
        />
      )}

      {selectedEvent && isReportEvent && selMod === 'fum' && selectedFumigationAssignment && (
        <FumigationReportDetailModal
          isOpen
          assignment={selectedFumigationAssignment}
          location={{
            _id: selectedFumigationAssignment.lugar_id,
            nombre: selectedFumigationAssignment.lugar_nombre,
            latitud: selectedFumigationAssignment.latitud,
            longitud: selectedFumigationAssignment.longitud,
          }}
          onClose={closeEventModal}
        />
      )}
    </div>
  );
};

export default CronogramaComponent;
