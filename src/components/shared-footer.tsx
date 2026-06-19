import Link from 'next/link';
import { MapPin, Phone, Mail, Facebook, Twitter, Linkedin } from 'lucide-react';
import Logo from '@/components/logo';

export default function SharedFooter() {
  return (
    <footer id="contact" className="bg-foreground text-background border-t pt-16">
      <div className="container px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1 */}
          <div className="space-y-5">
            <div className="filter invert">
              <Logo />
            </div>
            <p className="text-sm text-background/70 leading-relaxed">
              Votre partenaire de confiance pour des solutions de transport fiables et efficaces en Guinée.
            </p>
            <div className="flex items-center space-x-3">
              <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full bg-background/10 hover:bg-primary flex items-center justify-center transition-colors">
                <Facebook size={16} />
              </a>
              <a href="#" aria-label="Twitter" className="w-9 h-9 rounded-full bg-background/10 hover:bg-primary flex items-center justify-center transition-colors">
                <Twitter size={16} />
              </a>
              <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-full bg-background/10 hover:bg-primary flex items-center justify-center transition-colors">
                <Linkedin size={16} />
              </a>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-background">Nos Services</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link href="/services" className="footer-link hover:text-background transition-colors">Transport de Marchandises</Link></li>
              <li><Link href="/services" className="footer-link hover:text-background transition-colors">Envoi de Colis</Link></li>
              <li><Link href="/services" className="footer-link hover:text-background transition-colors">Déménagement</Link></li>
              <li><Link href="/services" className="footer-link hover:text-background transition-colors">Transport Pro</Link></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-background">Liens Rapides</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link href="/how-it-works" className="footer-link hover:text-background transition-colors">Comment ça marche ?</Link></li>
              <li><Link href="/#price-simulator" className="footer-link hover:text-background transition-colors">Simulateur de prix</Link></li>
              <li><Link href="/login" className="footer-link hover:text-background transition-colors">Espace client</Link></li>
              <li><Link href="/signup/transporter" className="footer-link hover:text-background transition-colors">Devenir transporteur</Link></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-background">Contact</h4>
            <ul className="space-y-3 text-sm text-background/70">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-primary mt-0.5 shrink-0" />
                <span>Lambanyi, commune de Ratoma, Immeuble Amizo</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={18} className="text-primary mt-0.5 shrink-0" />
                <div className="flex flex-col gap-1">
                  <a href="tel:+224612000102" className="hover:text-background transition-colors">612 00 01 02</a>
                  <a href="tel:+224669998339" className="hover:text-background transition-colors">669 99 83 39</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={18} className="text-primary mt-0.5 shrink-0" />
                <a href="mailto:info@informafrik.com" className="hover:text-background transition-colors">info@informafrik.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-background/15 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-background/50">
          <div className="text-center sm:text-left">
            <p>&copy; {new Date().getFullYear()} Informafrik SARLU. Tous droits réservés.</p>
            <p className="text-xs mt-1">N° RCCM: GN.KAL.2019.B.092 259 | NIF: 749265013</p>
          </div>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-background/80 transition-colors">Politique de confidentialité</Link>
            <Link href="#" className="hover:text-background/80 transition-colors">Conditions d&apos;utilisation</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
