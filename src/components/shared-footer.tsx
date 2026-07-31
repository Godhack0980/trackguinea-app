"use client";

import Link from 'next/link';
import { MapPin, Phone, Mail, Facebook, Twitter, Linkedin } from 'lucide-react';
import Logo from '@/components/logo';
import { useTranslation } from '@/lib/translations';

export default function SharedFooter() {
  const { t } = useTranslation();

  return (
    <footer id="contact" className="bg-foreground text-background border-t pt-16">
      <div className="container px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1 */}
          <div className="space-y-5">
            <div className="filter invert">
              <Logo width={200} height={60} />
            </div>
            <p className="text-sm text-background/70 leading-relaxed">
              {t('footer.desc')}
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
            <h4 className="font-semibold text-background">{t('footer.services_title')}</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link href="/services" className="footer-link hover:text-background transition-colors">{t('footer.service_goods')}</Link></li>
              <li><Link href="/services" className="footer-link hover:text-background transition-colors">{t('footer.service_parcel')}</Link></li>
              <li><Link href="/services" className="footer-link hover:text-background transition-colors">{t('footer.service_moving')}</Link></li>
              <li><Link href="/services" className="footer-link hover:text-background transition-colors">{t('footer.service_pro')}</Link></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-background">{t('footer.links_title')}</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link href="/how-it-works" className="footer-link hover:text-background transition-colors">{t('footer.link_how_it_works')}</Link></li>
              <li><Link href="/docs" className="footer-link text-indigo-300 font-bold hover:text-white transition-colors">📖 Documentation Officielle</Link></li>
              <li><Link href="/#price-simulator" className="footer-link hover:text-background transition-colors">{t('footer.link_simulator')}</Link></li>
              <li><Link href="/login" className="footer-link hover:text-background transition-colors">{t('footer.link_client_space')}</Link></li>
              <li><Link href="/signup/transporter" className="footer-link hover:text-background transition-colors">{t('footer.link_carrier')}</Link></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-background">{t('footer.contact_title')}</h4>
            <ul className="space-y-3 text-sm text-background/70">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-primary mt-0.5 shrink-0" />
                <span>{t('footer.contact_address')}</span>
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
            <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
            <p className="text-xs mt-1">{t('footer.n_rccm')}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-background/80 transition-colors">{t('footer.privacy_policy')}</Link>
            <Link href="/terms" className="hover:text-background/80 transition-colors">{t('footer.terms_of_use')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
