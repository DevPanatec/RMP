import { useEffect, useRef, useState } from 'react';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import './HeroStats.css';

const HeroStats = ({ stats = [] }) => {
  return (
    <div className="hero-stats">
      {stats.map((stat, index) => (
        <StatCard key={stat.id || index} stat={stat} delay={index * 100} />
      ))}
    </div>
  );
};

const StatCard = ({ stat, delay }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const targetValue = parseInt(stat.value) || 0;
    const duration = 2000;
    const steps = 60;
    const increment = targetValue / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setCount(targetValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(increment * currentStep));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, stat.value]);

  return (
    <div
      ref={cardRef}
      className="hero-stat-card"
    >
      <div className="stat-header">
        <div className="stat-icon-wrapper">
          <div className="stat-icon">
            {stat.icon}
          </div>
        </div>
        <div className="stat-label">{stat.label}</div>
      </div>
      <div className="stat-content">
        <div className="stat-value">
          {count}
          {stat.suffix || ''}
        </div>
        {stat.trend && (
          <div className={`stat-trend ${stat.trend.direction}`}>
            {stat.trend.icon} {stat.trend.value}
          </div>
        )}
      </div>

      {stat.sparklineData && stat.sparklineData.length > 0 && (
        <div className="stat-sparkline">
          <Sparklines data={stat.sparklineData} width={120} height={32}>
            <SparklinesLine
              color="var(--color-text-secondary)"
              style={{ fill: "none", strokeWidth: 2 }}
            />
          </Sparklines>
        </div>
      )}
    </div>
  );
};

export default HeroStats;
