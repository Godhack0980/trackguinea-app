/**
 * Exhaustive database of Guinean cities, all 33 prefectures, 300+ sub-prefectures (sous-préfectures),
 * mining ports, economic zones, and Conakry communes with accurate GPS coordinates.
 */
export const guineanCities: Record<string, { lat: number, lng: number }> = {
    // ==========================================
    // 1. ZONE SPÉCIALE DE CONAKRY & QUARTIERS / COMMUNES
    // ==========================================
    "Conakry": { lat: 9.53795, lng: -13.67729 },
    "Kaloum": { lat: 9.5091, lng: -13.7121 },
    "Port de Conakry": { lat: 9.5091, lng: -13.7121 },
    "Port Autonome": { lat: 9.5091, lng: -13.7121 },
    "Port Autonome de Conakry": { lat: 9.5091, lng: -13.7121 },
    "Grand Marché Madina": { lat: 9.5480, lng: -13.6600 },
    "Boulbinet": { lat: 9.5080, lng: -13.7150 },
    "Almamya": { lat: 9.5120, lng: -13.7080 },
    "Manquepas": { lat: 9.5150, lng: -13.7050 },
    "Coronthie": { lat: 9.5180, lng: -13.7000 },
    "Sandervalia": { lat: 9.5100, lng: -13.7100 },
    "Tombo": { lat: 9.5250, lng: -13.6900 },
    "Camayenne": { lat: 9.5380, lng: -13.6880 },
    "Donka": { lat: 9.5450, lng: -13.6800 },
    "Landréah": { lat: 9.5580, lng: -13.6750 },
    "Dixinn": { lat: 9.5532, lng: -13.6710 },
    "Belle-Vue": { lat: 9.5510, lng: -13.6780 },
    "Minière": { lat: 9.5620, lng: -13.6650 },
    "Madina": { lat: 9.5480, lng: -13.6600 },
    "Coléah": { lat: 9.53795, lng: -13.67729 },
    "Matam": { lat: 9.5645, lng: -13.6521 },
    "Bonfi": { lat: 9.5550, lng: -13.6600 },
    "Kenien": { lat: 9.5600, lng: -13.6550 },
    "Hafia": { lat: 9.5750, lng: -13.6450 },
    "Hamdallaye": { lat: 9.5780, lng: -13.6510 },
    "Bambéto": { lat: 9.5890, lng: -13.6390 },
    "Koloma": { lat: 9.5950, lng: -13.6300 },
    "Dar-Es-Salam": { lat: 9.5920, lng: -13.6200 },
    "Taouyah": { lat: 9.5931, lng: -13.6425 },
    "Taouya": { lat: 9.5931, lng: -13.6425 },
    "Kipé": { lat: 9.5992, lng: -13.6291 },
    "Ratoma": { lat: 9.6150, lng: -13.6210 },
    "Kaporo": { lat: 9.6050, lng: -13.6250 },
    "Kaporo Rails": { lat: 9.6080, lng: -13.6280 },
    "Cosa": { lat: 9.6090, lng: -13.6190 },
    "Nongo": { lat: 9.6251, lng: -13.6012 },
    "Lambanyi": { lat: 9.6380, lng: -13.5890 },
    "Yattaya": { lat: 9.6480, lng: -13.5780 },
    "Wanindara": { lat: 9.6320, lng: -13.5680 },
    "Foulamadina": { lat: 9.6630, lng: -13.5650 },
    "Enco5": { lat: 9.6180, lng: -13.5990 },
    "Matoto": { lat: 9.6083, lng: -13.5622 },
    "Gbessia": { lat: 9.5769, lng: -13.6120 },
    "Yimbaya": { lat: 9.5850, lng: -13.6050 },
    "Sangoyah": { lat: 9.6010, lng: -13.5780 },
    "Kissosso": { lat: 9.6110, lng: -13.5650 },
    "Entag": { lat: 9.6210, lng: -13.5480 },
    "Cobayah": { lat: 9.6452, lng: -13.5510 },
    "Kobaya": { lat: 9.6452, lng: -13.5510 },
    "Simambossia": { lat: 9.6520, lng: -13.5580 },
    "Sonfonia": { lat: 9.6581, lng: -13.5290 },
    "Sonfonia Gare": { lat: 9.6650, lng: -13.5350 },
    "Cocoma": { lat: 9.6490, lng: -13.5080 },
    "Lansanaya": { lat: 9.6350, lng: -13.5350 },
    "Lansanaya Barrage": { lat: 9.6400, lng: -13.5150 },
    "Lansanaya Village": { lat: 9.6420, lng: -13.5200 },
    "Tadi": { lat: 9.6180, lng: -13.6350 },
    "Yembeya": { lat: 9.6100, lng: -13.6300 },
    "Tangan": { lat: 9.6800, lng: -13.5100 },
    "Dabompa": { lat: 9.6490, lng: -13.5180 },
    "Tombolia": { lat: 9.6400, lng: -13.5300 },
    "Kountia": { lat: 9.6680, lng: -13.4980 },
    "Sanoyah": { lat: 9.6800, lng: -13.4790 },
    "Cimenterie": { lat: 9.6750, lng: -13.4890 },
    "Km36": { lat: 9.6950, lng: -13.4750 },
    "Kagbelen": { lat: 9.6912, lng: -13.4831 },
    "Zone Industrielle Kagbélen": { lat: 9.6912, lng: -13.4831 },
    "Zone Industrielle Kagbelen": { lat: 9.6912, lng: -13.4831 },
    "Coyah": { lat: 9.7050, lng: -13.3850 },
    "Maneah": { lat: 9.7150, lng: -13.4150 },
    "Dubréka": { lat: 9.7911, lng: -13.5233 },
    "Kassa": { lat: 9.4833, lng: -13.7500 },
    "Îles de Loos": { lat: 9.4833, lng: -13.7500 },

    // ==========================================
    // 2. RÉGION DE BOKÉ & SOUS-PRÉFECTURES
    // ==========================================
    // Préfecture de Boké
    "Boké": { lat: 10.9333, lng: -14.2917 },
    "Kamsar": { lat: 10.6500, lng: -14.6000 },
    "Port de Kamsar": { lat: 10.6500, lng: -14.6000 },
    "Sangarédi": { lat: 11.1000, lng: -14.2167 },
    "Kolaboui": { lat: 10.7833, lng: -14.4167 },
    "Dabiss": { lat: 11.1833, lng: -14.4833 },
    "Bintimodia": { lat: 10.8667, lng: -14.6000 },
    "Malapouya": { lat: 10.8833, lng: -14.0833 },
    "Kanfarandé": { lat: 10.7500, lng: -14.7833 },
    "Sansalé": { lat: 10.9500, lng: -14.8833 },
    "Tanènè (Boké)": { lat: 10.9667, lng: -14.1500 },
    "Dapilon": { lat: 10.8500, lng: -14.5500 },
    "Katougouma": { lat: 10.8800, lng: -14.4500 },

    // Préfecture de Boffa
    "Boffa": { lat: 10.1833, lng: -14.0333 },
    "Koba": { lat: 10.0167, lng: -14.0333 },
    "Koba-Tatema": { lat: 10.0167, lng: -14.0333 },
    "Tougnifily": { lat: 10.3667, lng: -14.2167 },
    "Douprou": { lat: 10.2333, lng: -14.2000 },
    "Tamita": { lat: 10.3500, lng: -13.9833 },
    "Mankountan": { lat: 10.2500, lng: -14.3333 },
    "Colia": { lat: 10.2833, lng: -13.9000 },
    "Lisso": { lat: 10.1500, lng: -13.9500 },
    "Bel Air": { lat: 10.0833, lng: -14.1667 },

    // Préfecture de Fria
    "Fria": { lat: 10.3667, lng: -13.5833 },
    "Kimbo": { lat: 10.3667, lng: -13.5833 },
    "Baguinet": { lat: 10.4500, lng: -13.4333 },
    "Banguingny": { lat: 10.3000, lng: -13.6833 },
    "Tormelin": { lat: 10.2333, lng: -13.5167 },

    // Préfecture de Gaoual
    "Gaoual": { lat: 11.7500, lng: -13.3500 },
    "Kounsitel": { lat: 11.6667, lng: -13.0833 },
    "Koumbia": { lat: 11.9000, lng: -13.5833 },
    "Kakony": { lat: 11.5333, lng: -13.2500 },
    "Foulamory": { lat: 12.0167, lng: -13.6167 },
    "Malanta": { lat: 11.7833, lng: -13.2000 },
    "Touba (Gaoual)": { lat: 11.6000, lng: -13.6167 },
    "Wendou M'Bour": { lat: 11.6333, lng: -13.4833 },

    // Préfecture de Koundara
    "Koundara": { lat: 12.4833, lng: -13.3000 },
    "Sambailo": { lat: 12.5500, lng: -13.3500 },
    "Sambaïlo": { lat: 12.5500, lng: -13.3500 },
    "Youkounkoun": { lat: 12.5333, lng: -13.1333 },
    "Saréboïdo": { lat: 12.3500, lng: -13.2667 },
    "Guingan": { lat: 12.4333, lng: -13.5333 },
    "Kamaby": { lat: 12.3000, lng: -13.4167 },
    "Termessé": { lat: 12.5833, lng: -13.0333 },

    // ==========================================
    // 3. RÉGION DE KINDIA & SOUS-PRÉFECTURES
    // ==========================================
    // Préfecture de Kindia
    "Kindia": { lat: 10.0570, lng: -12.8556 },
    "Friguiagbé": { lat: 9.9333, lng: -12.9833 },
    "Bangouyah": { lat: 10.3333, lng: -12.9000 },
    "Bangouya": { lat: 10.3333, lng: -12.9000 },
    "Damankanyah": { lat: 10.0333, lng: -12.8833 },
    "Damakania": { lat: 10.0333, lng: -12.8833 },
    "Kolenté": { lat: 10.1167, lng: -12.6333 },
    "Madina-Oula": { lat: 9.7500, lng: -12.7667 },
    "Mambia": { lat: 10.0833, lng: -13.0667 },
    "Molota": { lat: 10.1500, lng: -12.9833 },
    "Samayah": { lat: 9.8500, lng: -12.9167 },
    "Souguéta": { lat: 10.2333, lng: -12.6833 },
    "Garafiri": { lat: 10.4500, lng: -12.8333 },

    // Préfecture de Coyah
    "Manéah": { lat: 9.6833, lng: -13.4333 },
    "Kouriah": { lat: 9.7667, lng: -13.3167 },
    "Wonkifong": { lat: 9.6167, lng: -13.3500 },

    // Préfecture de Dubréka
    "Dubreka": { lat: 9.7911, lng: -13.5233 },
    "Khorira": { lat: 9.8500, lng: -13.5000 },
    "Tanéné": { lat: 9.9333, lng: -13.4667 },
    "Badi": { lat: 10.1500, lng: -13.4000 },
    "Falessade": { lat: 10.0833, lng: -13.3500 },
    "Ouassou": { lat: 9.8833, lng: -13.5500 },
    "Tondon": { lat: 10.3167, lng: -13.3500 },
    "Souapiti": { lat: 10.4167, lng: -13.2500 },
    "Kaléta": { lat: 10.4667, lng: -13.2667 },

    // Préfecture de Forécariah
    "Forécariah": { lat: 9.4306, lng: -13.0881 },
    "Forecariah": { lat: 9.4306, lng: -13.0881 },
    "Farmoriah": { lat: 9.3000, lng: -13.0000 },
    "Maferinyah": { lat: 9.5500, lng: -13.2333 },
    "Maferinya": { lat: 9.5500, lng: -13.2333 },
    "Alassoyah": { lat: 9.3833, lng: -13.1500 },
    "Benty": { lat: 9.1833, lng: -13.2000 },
    "Kaback": { lat: 9.3167, lng: -13.2833 },
    "Kakossa": { lat: 9.2500, lng: -13.2167 },
    "Kallia": { lat: 9.4500, lng: -12.9833 },
    "Moussayah": { lat: 9.5000, lng: -12.9167 },
    "Sikhourou": { lat: 9.5833, lng: -12.9500 },
    "Moribayah": { lat: 9.3500, lng: -13.1167 },
    "Port de Moribayah": { lat: 9.3500, lng: -13.1167 },
    "Konta": { lat: 9.2833, lng: -13.1833 },

    // Préfecture de Télimélé
    "Télimélé": { lat: 10.9000, lng: -13.0333 },
    "Telimele": { lat: 10.9000, lng: -13.0333 },
    "Sarékaly": { lat: 10.8333, lng: -13.1000 },
    "Gougoudjé": { lat: 10.7500, lng: -13.2167 },
    "Bourouwal": { lat: 10.8000, lng: -12.9333 },
    "Daramagnaki": { lat: 11.0333, lng: -13.3167 },
    "Koba (Télimélé)": { lat: 10.9667, lng: -12.8500 },
    "Kollet": { lat: 11.1167, lng: -12.9500 },
    "Konsotami": { lat: 10.9333, lng: -13.2000 },
    "Missira (Télimélé)": { lat: 11.1500, lng: -13.1333 },
    "Santou": { lat: 11.0833, lng: -13.2500 },
    "Sinta": { lat: 10.7833, lng: -13.0333 },
    "Sogolon": { lat: 10.6667, lng: -13.1500 },
    "Tarihoye": { lat: 10.8667, lng: -12.8000 },

    // ==========================================
    // 4. RÉGION DE MAMOU & SOUS-PRÉFECTURES
    // ==========================================
    // Préfecture de Mamou
    "Mamou": { lat: 10.3750, lng: -12.0833 },
    "Timbo": { lat: 10.4167, lng: -11.8333 },
    "Bouliwel": { lat: 10.4500, lng: -12.2167 },
    "Dounet": { lat: 10.2833, lng: -11.9500 },
    "Gongoret": { lat: 10.6000, lng: -12.1167 },
    "Kégnéko": { lat: 10.5167, lng: -11.9833 },
    "Konkouré": { lat: 10.2500, lng: -12.2500 },
    "Nyagara": { lat: 10.1500, lng: -12.1000 },
    "Ouré-Kaba": { lat: 9.8833, lng: -11.8833 },
    "Porédaka": { lat: 10.6167, lng: -12.1667 },
    "Saramoussaya": { lat: 10.5500, lng: -11.7500 },
    "Soyah": { lat: 10.2167, lng: -12.0500 },
    "Téguéréya": { lat: 10.6833, lng: -11.9000 },
    "Tolo": { lat: 10.4000, lng: -12.1833 },

    // Préfecture de Dalaba
    "Dalaba": { lat: 10.6833, lng: -12.2500 },
    "Ditinn": { lat: 10.7500, lng: -12.1833 },
    "Bodié": { lat: 10.5833, lng: -12.3500 },
    "Kaala": { lat: 10.6333, lng: -12.2000 },
    "Kankalabé": { lat: 10.8333, lng: -12.1167 },
    "Kébali": { lat: 10.7833, lng: -12.3833 },
    "Koba (Dalaba)": { lat: 10.6000, lng: -12.4500 },
    "Mitti": { lat: 10.7000, lng: -12.1000 },
    "Mombéyah": { lat: 10.8167, lng: -12.2833 },

    // Préfecture de Pita
    "Pita": { lat: 11.0583, lng: -12.3950 },
    "Timbi-Madina": { lat: 11.1667, lng: -12.4833 },
    "Timbi-Touny": { lat: 11.2333, lng: -12.5667 },
    "Bantignel": { lat: 11.0833, lng: -12.2500 },
    "Bourouwal-Tappé": { lat: 10.9500, lng: -12.3500 },
    "Dongol-Touma": { lat: 11.1333, lng: -12.3167 },
    "Gongoré": { lat: 10.9833, lng: -12.4833 },
    "Ley-Miro": { lat: 10.8833, lng: -12.6000 },
    "Maci": { lat: 10.8500, lng: -12.4167 },
    "Ninguélandé": { lat: 11.1833, lng: -12.2167 },
    "Sintali": { lat: 11.0333, lng: -12.4500 },

    // ==========================================
    // 5. RÉGION DE LABÉ & SOUS-PRÉFECTURES
    // ==========================================
    // Préfecture de Labé
    "Labé": { lat: 11.3186, lng: -12.2833 },
    "Labe": { lat: 11.3186, lng: -12.2833 },
    "Popodara": { lat: 11.4000, lng: -12.3500 },
    "Hafia (Labé)": { lat: 11.2333, lng: -12.2000 },
    "Dalein": { lat: 11.4500, lng: -12.2500 },
    "Daralabé": { lat: 11.2667, lng: -12.1500 },
    "Diari": { lat: 11.5333, lng: -12.3000 },
    "Dionfo": { lat: 11.4667, lng: -12.1333 },
    "Garambé": { lat: 11.2833, lng: -12.3333 },
    "Kaalan": { lat: 11.3667, lng: -12.2167 },
    "Kouramangui": { lat: 11.5833, lng: -12.2333 },
    "Noussy": { lat: 11.3833, lng: -12.1167 },
    "Sannoun": { lat: 11.2000, lng: -12.3500 },
    "Tountouroun": { lat: 11.3500, lng: -12.4167 },

    // Préfecture de Koubia
    "Koubia": { lat: 11.5833, lng: -11.9000 },
    "Fafaya": { lat: 11.6667, lng: -11.7500 },
    "Gadha-Woundou": { lat: 11.8333, lng: -11.6833 },
    "Matakaou": { lat: 11.4833, lng: -11.8500 },
    "Missira (Koubia)": { lat: 11.6167, lng: -11.9833 },
    "Pilimini": { lat: 11.5000, lng: -12.0333 },

    // Préfecture de Lélouma
    "Lélouma": { lat: 11.4333, lng: -12.6500 },
    "Lelouma": { lat: 11.4333, lng: -12.6500 },
    "Sagalé": { lat: 11.4833, lng: -12.5833 },
    "Balaya": { lat: 11.2833, lng: -12.7500 },
    "Diountou": { lat: 11.5833, lng: -12.7000 },
    "Hérico": { lat: 11.3667, lng: -12.7167 },
    "Korbé": { lat: 11.4000, lng: -12.5000 },
    "Lafou": { lat: 11.5500, lng: -12.5500 },
    "Linsan": { lat: 11.3000, lng: -12.6000 },
    "Parawol": { lat: 11.6333, lng: -12.6167 },
    "Sanoun": { lat: 11.4500, lng: -12.4833 },

    // Préfecture de Mali
    "Mali": { lat: 12.0833, lng: -12.3000 },
    "Mali-Yembéring": { lat: 12.0833, lng: -12.3000 },
    "Yembéring": { lat: 12.0167, lng: -12.2500 },
    "Balaki": { lat: 12.3667, lng: -12.4333 },
    "Donghel-Sigon": { lat: 12.1333, lng: -12.1833 },
    "Dougountouny": { lat: 11.8500, lng: -12.4833 },
    "Fougou": { lat: 12.1833, lng: -12.4000 },
    "Gayah": { lat: 12.2500, lng: -12.2833 },
    "Hidayatou": { lat: 11.9500, lng: -12.3833 },
    "Lébékére": { lat: 11.9000, lng: -12.2500 },
    "Madina-Wora": { lat: 12.2833, lng: -12.1500 },
    "Salambandé": { lat: 12.1167, lng: -12.5167 },
    "Téliré": { lat: 11.8833, lng: -12.1500 },
    "Touba (Mali)": { lat: 12.0500, lng: -12.4500 },

    // Préfecture de Tougué
    "Tougué": { lat: 11.4500, lng: -11.6667 },
    "Tougue": { lat: 11.4500, lng: -11.6667 },
    "Fatako": { lat: 11.4000, lng: -11.7833 },
    "Fello-Koundoua": { lat: 11.6000, lng: -11.5500 },
    "Kansangui": { lat: 11.5167, lng: -11.7167 },
    "Kolangui": { lat: 11.3500, lng: -11.5833 },
    "Kolissoko": { lat: 11.5500, lng: -11.6167 },
    "Kouratongo": { lat: 11.7167, lng: -11.4833 },
    "Koïn": { lat: 11.3167, lng: -11.8500 },
    "Tangali": { lat: 11.4833, lng: -11.8167 },

    // ==========================================
    // 6. RÉGION DE FARANAH & SOUS-PRÉFECTURES
    // ==========================================
    // Préfecture de Faranah
    "Faranah": { lat: 10.0436, lng: -10.7455 },
    "Banian": { lat: 9.8333, lng: -10.6000 },
    "Beindou": { lat: 9.7500, lng: -10.8333 },
    "Gnaléah": { lat: 10.1500, lng: -10.6500 },
    "Heremakonon": { lat: 9.6833, lng: -10.7833 },
    "Kobikoro": { lat: 10.2000, lng: -10.8833 },
    "Marela": { lat: 10.2500, lng: -11.1000 },
    "Passayah": { lat: 9.9500, lng: -10.9000 },
    "Sandénia": { lat: 10.3500, lng: -10.6167 },
    "Songoyah": { lat: 9.8833, lng: -10.7167 },
    "Tiro": { lat: 9.7833, lng: -10.4833 },
    "Tindo": { lat: 10.1000, lng: -10.8167 },

    // Préfecture de Dabola
    "Dabola": { lat: 10.7417, lng: -11.1119 },
    "Bissikrima": { lat: 10.8167, lng: -10.9667 },
    "Banko": { lat: 10.5833, lng: -10.9500 },
    "Arfamoussaya": { lat: 10.6667, lng: -11.3167 },
    "Dogomet": { lat: 10.9167, lng: -11.2333 },
    "Kankama": { lat: 10.8667, lng: -11.0833 },
    "Kindoyé": { lat: 10.5000, lng: -11.1833 },
    "Konendou": { lat: 10.6000, lng: -11.0500 },
    "N'Déma": { lat: 10.7000, lng: -11.2000 },

    // Préfecture de Dinguiraye
    "Dinguiraye": { lat: 11.3000, lng: -10.7167 },
    "Banora": { lat: 11.5500, lng: -10.9000 },
    "Dialakoro (Dinguiraye)": { lat: 11.2000, lng: -10.8500 },
    "Diatiféré": { lat: 11.4000, lng: -10.5500 },
    "Gagnakaly": { lat: 11.6500, lng: -10.7833 },
    "Kalinko": { lat: 11.1000, lng: -10.6000 },
    "Lansanaya (Dinguiraye)": { lat: 11.4500, lng: -10.7500 },
    "Sélouma": { lat: 11.2500, lng: -10.9500 },
    "Tambakounda": { lat: 11.7500, lng: -10.6833 },

    // Préfecture de Kissidougou
    "Kissidougou": { lat: 9.1833, lng: -10.1000 },
    "Albadariah": { lat: 9.3833, lng: -10.2500 },
    "Banama": { lat: 9.0500, lng: -10.0500 },
    "Bardou": { lat: 9.2500, lng: -9.9500 },
    "Beindou (Kissidougou)": { lat: 9.1167, lng: -10.2833 },
    "Fermessadou-Pombo": { lat: 9.3000, lng: -10.0167 },
    "Firawa": { lat: 9.0833, lng: -10.1833 },
    "Gbangbadou": { lat: 9.2000, lng: -10.2167 },
    "Koundiatou": { lat: 9.1500, lng: -9.9833 },
    "Manfran": { lat: 9.3500, lng: -10.1333 },
    "Sangardo": { lat: 9.2833, lng: -10.1833 },
    "Yendé-Millimou": { lat: 9.0167, lng: -10.1500 },
    "Yombiro": { lat: 9.4167, lng: -10.0833 },

    // ==========================================
    // 7. RÉGION DE KANKAN & SOUS-PRÉFECTURES
    // ==========================================
    // Préfecture de Kankan
    "Kankan": { lat: 10.3854, lng: -9.3057 },
    "Baté-Nafadji": { lat: 10.6167, lng: -9.2333 },
    "Balandou": { lat: 10.4500, lng: -9.2500 },
    "Boula": { lat: 10.2500, lng: -9.4500 },
    "Gbérédou-Baranama": { lat: 10.5000, lng: -9.1000 },
    "Kanfamoriya": { lat: 10.3500, lng: -9.3500 },
    "Koumban": { lat: 10.2833, lng: -9.1833 },
    "Mamouroudou": { lat: 10.1500, lng: -9.5167 },
    "Misamana": { lat: 10.5500, lng: -9.4000 },
    "Sabadou-Baranama": { lat: 10.4833, lng: -9.0167 },
    "Tinti-Oulen": { lat: 10.2000, lng: -9.2833 },
    "Tokounou": { lat: 10.1000, lng: -9.6000 },

    // Préfecture de Siguiri
    "Siguiri": { lat: 11.4167, lng: -9.1667 },
    "Kintinian": { lat: 11.5333, lng: -9.2833 },
    "Doko": { lat: 11.6000, lng: -8.9833 },
    "Franwalia": { lat: 11.3000, lng: -9.3500 },
    "Maléa": { lat: 11.5000, lng: -8.8500 },
    "Malea": { lat: 11.5000, lng: -8.8500 },
    "Bankon": { lat: 11.3500, lng: -9.0500 },
    "Kiniébakoura": { lat: 11.2500, lng: -9.2000 },
    "Naboun": { lat: 11.1833, lng: -9.4500 },
    "Niagassola": { lat: 12.3167, lng: -9.1167 },
    "Niandankoro": { lat: 11.4667, lng: -9.0833 },
    "Norassoba": { lat: 11.1500, lng: -9.3167 },
    "Nounkounkan": { lat: 11.2833, lng: -8.9500 },
    "Siguirini": { lat: 11.7500, lng: -9.1000 },
    "Tomba-Kansa": { lat: 11.4000, lng: -9.2500 },
    "Bouré": { lat: 11.5000, lng: -9.2500 },

    // Préfecture de Mandiana
    "Mandiana": { lat: 10.6333, lng: -8.6833 },
    "Balandougouba": { lat: 10.8500, lng: -8.5500 },
    "Dialakoro (Mandiana)": { lat: 10.4500, lng: -8.7833 },
    "Faralako": { lat: 10.5500, lng: -8.5000 },
    "Kantoumanina": { lat: 10.7500, lng: -8.6167 },
    "Kiniéran": { lat: 10.8000, lng: -8.7500 },
    "Koudianakoro": { lat: 10.3500, lng: -8.6000 },
    "Morodou": { lat: 10.7000, lng: -8.8500 },
    "Niantanina": { lat: 10.9500, lng: -8.6500 },
    "Saladou": { lat: 10.5000, lng: -8.8500 },
    "Sansando": { lat: 10.6500, lng: -8.5500 },

    // Préfecture de Kouroussa
    "Kouroussa": { lat: 10.6500, lng: -9.8833 },
    "Babila": { lat: 10.5500, lng: -9.7500 },
    "Balato": { lat: 10.7500, lng: -9.9500 },
    "Banfélé": { lat: 10.8500, lng: -9.8000 },
    "Baro": { lat: 10.6000, lng: -10.0500 },
    "Cisséla": { lat: 10.4833, lng: -10.1500 },
    "Douako": { lat: 10.5000, lng: -9.6500 },
    "Doura": { lat: 10.8000, lng: -10.1000 },
    "Kiniéro": { lat: 10.7000, lng: -9.7000 },
    "Komola-Koura": { lat: 10.7833, lng: -9.8500 },
    "Koumana": { lat: 10.5833, lng: -9.9500 },
    "Sanguiana": { lat: 10.4000, lng: -9.8500 },

    // Préfecture de Kérouané
    "Kérouané": { lat: 9.2667, lng: -9.0167 },
    "Kerouane": { lat: 9.2667, lng: -9.0167 },
    "Banankoro": { lat: 9.1500, lng: -9.3167 },
    "Damaro": { lat: 9.4500, lng: -8.8833 },
    "Komodou": { lat: 9.3500, lng: -9.1500 },
    "Kounsankoro": { lat: 9.1833, lng: -8.9500 },
    "Linko": { lat: 9.4000, lng: -9.0500 },
    "Sibiribaro": { lat: 9.2200, lng: -9.1000 },
    "Soromaya": { lat: 9.5000, lng: -8.9833 },

    // ==========================================
    // 8. RÉGION DE NZÉRÉKORÉ & SOUS-PRÉFECTURES
    // ==========================================
    // Préfecture de Nzérékoré
    "Nzérékoré": { lat: 7.7550, lng: -8.8181 },
    "Nzerekore": { lat: 7.7550, lng: -8.8181 },
    "Bounouma": { lat: 7.8500, lng: -8.9500 },
    "Gouécké": { lat: 7.9500, lng: -8.8500 },
    "Gouecke": { lat: 7.9500, lng: -8.8500 },
    "Kobéla": { lat: 7.6500, lng: -8.9000 },
    "Koropara": { lat: 8.0500, lng: -8.9833 },
    "Koulé": { lat: 7.8833, lng: -8.7500 },
    "Palé": { lat: 7.6833, lng: -8.7000 },
    "Samoe": { lat: 7.7833, lng: -8.8833 },
    "Soulouta": { lat: 7.9000, lng: -8.6500 },
    "Womey": { lat: 7.7000, lng: -8.9833 },
    "Yalenzou": { lat: 7.6000, lng: -8.8000 },

    // Préfecture de Macenta
    "Macenta": { lat: 8.5425, lng: -9.4711 },
    "Sengbédou": { lat: 8.6500, lng: -9.3500 },
    "Sérédou": { lat: 8.3833, lng: -9.3000 },
    "Balizia": { lat: 8.6000, lng: -9.5500 },
    "Bignamou": { lat: 8.3500, lng: -9.2000 },
    "Bofossou": { lat: 8.4500, lng: -9.3833 },
    "Daro": { lat: 8.7000, lng: -9.4500 },
    "Fassankoni": { lat: 8.4833, lng: -9.6000 },
    "Kouankan": { lat: 8.6200, lng: -9.2500 },
    "Koyama": { lat: 8.2833, lng: -9.3500 },
    "N'Zébéla": { lat: 8.7500, lng: -9.3000 },
    "Ourémai": { lat: 8.5800, lng: -9.4000 },
    "Panziazou": { lat: 8.5000, lng: -9.5000 },
    "Vasérédou": { lat: 8.4000, lng: -9.4500 },
    "Watanka": { lat: 8.6800, lng: -9.5000 },

    // Préfecture de Guéckédou
    "Guéckédou": { lat: 8.5667, lng: -10.1333 },
    "Gueckedou": { lat: 8.5667, lng: -10.1333 },
    "Bolodou": { lat: 8.7000, lng: -10.2500 },
    "Fangamadou": { lat: 8.6500, lng: -10.0500 },
    "Guendembou": { lat: 8.4833, lng: -10.2000 },
    "Kassadou": { lat: 8.7500, lng: -10.1500 },
    "Koundou": { lat: 8.6000, lng: -10.3000 },
    "Nongoa": { lat: 8.4500, lng: -10.0833 },
    "Ouéndé-Kénéma": { lat: 8.5200, lng: -10.2500 },
    "Tékoulo": { lat: 8.6200, lng: -10.1833 },
    "Termessadou-Dibo": { lat: 8.4000, lng: -10.1500 },

    // Préfecture de Beyla
    "Beyla": { lat: 8.6833, lng: -8.6500 },
    "Boola": { lat: 8.8500, lng: -8.5500 },
    "Diassodou": { lat: 8.5500, lng: -8.7500 },
    "Fouala": { lat: 8.7833, lng: -8.6000 },
    "Gbakédou": { lat: 8.9000, lng: -8.7000 },
    "Gbéssoba": { lat: 8.6000, lng: -8.5000 },
    "Karala": { lat: 8.7200, lng: -8.4500 },
    "Koumandou": { lat: 8.5000, lng: -8.6500 },
    "Moussadou": { lat: 8.8000, lng: -8.8000 },
    "Nionsomoridou": { lat: 8.6500, lng: -8.8500 },
    "Samana": { lat: 8.7500, lng: -8.7000 },
    "Sinko": { lat: 8.4500, lng: -8.5500 },
    "Sokourala": { lat: 8.9500, lng: -8.6000 },

    // Préfecture de Lola
    "Lola": { lat: 7.7167, lng: -8.5333 },
    "Bossou": { lat: 7.6500, lng: -8.5167 },
    "Foumbadou": { lat: 7.9500, lng: -8.4500 },
    "Gamba": { lat: 7.8000, lng: -8.5000 },
    "Guéassou": { lat: 7.8500, lng: -8.4000 },
    "Kokota": { lat: 7.7500, lng: -8.4833 },
    "Laine": { lat: 7.8833, lng: -8.5500 },
    "Lainé": { lat: 7.8833, lng: -8.5500 },
    "N'Zoo": { lat: 7.6000, lng: -8.4667 },
    "Tounkarata": { lat: 7.6833, lng: -8.5833 },

    // Préfecture de Yomou
    "Yomou": { lat: 7.5667, lng: -9.2500 },
    "Diécké": { lat: 7.3500, lng: -8.9500 },
    "Diecke": { lat: 7.3500, lng: -8.9500 },
    "Banié": { lat: 7.6500, lng: -9.1833 },
    "Bheeta": { lat: 7.4500, lng: -9.1000 },
    "Bignamou (Yomou)": { lat: 7.4000, lng: -9.0500 },
    "Bowé": { lat: 7.5000, lng: -9.2000 },

    // ==========================================
    // 9. SITES STRATÉGIQUES & PROJETS MINIERS
    // ==========================================
    "Simandou": { lat: 8.5333, lng: -8.9167 },
    "Simandou - Bloc 1": { lat: 8.7500, lng: -8.8833 },
    "Simandou - Bloc 2": { lat: 8.6500, lng: -8.9000 },
    "Simandou - Bloc 3": { lat: 8.4500, lng: -8.9333 },
    "Simandou - Bloc 4": { lat: 8.3500, lng: -8.9500 },
    "Kalia Mine": { lat: 9.4500, lng: -12.9833 },
};

export const cityNames = Object.keys(guineanCities);

/**
 * Robust string normalization for matching locations with accents, dashes, prefixes, or country tags.
 */
function normalizeLocName(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics / accents
    .replace(/\s*\([^)]*\)/g, "") // remove anything in parentheses like "(Guinée)"
    .replace(/[-_,\.\/]/g, " ") // replace dashes, commas with spaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strict synchronous resolver for any Guinean locality.
 * Returns null if not found (NO silent fallback to Conakry).
 */
export function getGuineanCityCoordsStrict(cityRaw: string): { lat: number; lng: number } | null {
  if (!cityRaw) return null;
  
  const rawTrimmed = cityRaw.trim();

  // 1. Direct exact match in dictionary
  if (guineanCities[rawTrimmed]) return guineanCities[rawTrimmed];

  // 2. Clean parenthetical country/region suffixes: "Kamsar (Guinée)" -> "Kamsar"
  const cleanName = rawTrimmed.split('(')[0].split(',')[0].trim();
  if (guineanCities[cleanName]) return guineanCities[cleanName];

  // 3. Composite name handling: "Boké - Kamsar" -> check "Kamsar" then "Boké"
  if (cleanName.includes('-') || cleanName.includes('–')) {
    const parts = cleanName.split(/[-–]/).map(p => p.trim()).filter(Boolean);
    // Check right-hand side first (the more specific sub-prefecture)
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (guineanCities[p]) return guineanCities[p];
    }
  }

  // 4. Normalized fuzzy search
  const normalizedTarget = normalizeLocName(cleanName);
  
  // Exact normalized match
  for (const [key, coords] of Object.entries(guineanCities)) {
    if (normalizeLocName(key) === normalizedTarget) {
      return coords;
    }
  }

  // Substring inclusion match (e.g. "kamsar" in "port de kamsar" or vice versa)
  for (const [key, coords] of Object.entries(guineanCities)) {
    const normKey = normalizeLocName(key);
    if (normKey.includes(normalizedTarget) || normalizedTarget.includes(normKey)) {
      return coords;
    }
  }

  return null;
}

/**
 * Synchronous resolver for any Guinean prefecture, sous-préfecture, or commune.
 * Legacy compatibility fallback to Conakry for visual tracking maps.
 */
export function getGuineanCityCoords(cityRaw: string): { lat: number; lng: number } {
  const strict = getGuineanCityCoordsStrict(cityRaw);
  return strict || guineanCities["Conakry"];
}

/**
 * Async coordinate lookup with Mapbox Geocoding fallback for any unlisted village / sub-prefecture.
 */
export async function getGuineanCityCoordsAsync(cityRaw: string, mapboxToken?: string): Promise<{ lat: number; lng: number }> {
  const syncCoords = getGuineanCityCoordsStrict(cityRaw);
  if (syncCoords) return syncCoords;
  if (!cityRaw) return guineanCities["Conakry"];

  const cleanName = cityRaw.split('(')[0].split(',')[0].trim();
  const token = mapboxToken || process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return guineanCities["Conakry"];

  try {
    const queryTerm = cleanName.includes("Guinée") || cleanName.includes("Guinea") 
      ? cleanName 
      : `${cleanName}, Guinea`;

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(queryTerm)}.json?access_token=${token}&country=gn&limit=1`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const coords = { lat, lng };
        guineanCities[cleanName] = coords; // Cache locally
        return coords;
      }
    }
  } catch (err) {
    console.warn("Mapbox geocoding lookup fallback error:", err);
  }

  return guineanCities["Conakry"];
}
