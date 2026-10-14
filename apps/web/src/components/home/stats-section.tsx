"use client";

import { AnimatedCounter } from "@/components/ui/animated-counter";

const stats = [
  { value: 236, label: "Interview Segments", suffix: "" },
  { value: 3, label: "Model Distillations", suffix: "" },
  { value: 15, label: "Operator Types", suffix: "+" },
  { value: 40, label: "Words of Wisdom", suffix: "k+" },
];

/**
 * Stats section with animated counters that count up when visible.
 * Used on the home page to display key project metrics.
 */
export function StatsSection() {
  return (
    <section className="py-6 sm:py-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`text-center p-4 sm:p-5 rounded-xl bg-muted/30 hover:bg-muted/50 sm:bg-muted/20 sm:hover:bg-muted/40 border border-transparent hover:border-border/50 transition-all duration-300 animate-fade-in stagger-${index + 1} group cursor-default`}
          >
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient-primary group-hover:scale-105 transition-transform duration-300">
              <AnimatedCounter
                value={stat.value}
                suffix={stat.suffix}
                duration={1200}
                delay={index * 100}
              />
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-1.5 group-hover:text-foreground/70 transition-colors duration-300">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
