const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-center">
          <h1 className="font-elegant text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Motion Crafted
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
