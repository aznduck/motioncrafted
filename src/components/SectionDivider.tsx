const SectionDivider = () => {
  return (
    <div className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-4">
          <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-border"></div>
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '0s' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-border"></div>
        </div>
      </div>
    </div>
  );
};

export default SectionDivider;
