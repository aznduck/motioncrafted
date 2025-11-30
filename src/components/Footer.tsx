import { Mail } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-12 bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-6">
          <div className="font-elegant text-xl font-semibold tracking-tight text-foreground">
            Motion Crafted
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-5 h-5" />
            <a 
              href="mailto:motioncrafted@gmail.com" 
              className="hover:text-primary transition-smooth"
            >
              motioncrafted@gmail.com
            </a>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>© {currentYear} Motion Crafted. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
