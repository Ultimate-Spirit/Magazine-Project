interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function Card({ children, className = "", title, subtitle }: CardProps) {
  return (
    <div className={`bg-card rounded-[2rem] overflow-hidden shadow-sm transition-all hover:shadow-xl hover:shadow-primary/5 ${className}`}>
      {(title || subtitle) && (
        <div className="px-10 py-8 border-b border-border/50 bg-secondary/30">
          {title && <h3 className="font-display font-bold text-2xl tracking-tight">{title}</h3>}
          {subtitle && <p className="text-sm font-body text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      )}
      <div className="p-10">
        {children}
      </div>
    </div>
  );
}
