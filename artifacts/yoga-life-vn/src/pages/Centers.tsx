import { useListCenters } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { useLang } from "@/lib/lang-context";
import { MapPin, Phone, Mail, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function Centers() {
  const { t } = useLang();
  const { data, isLoading } = useListCenters();
  const centers = data?.centers || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">{t.centers.title}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.centers.subtitle}</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => <div key={i} className="h-64 bg-card rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {centers.map((c, idx) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                  <Card className="border-none premium-shadow overflow-hidden hover:shadow-xl transition-all duration-300 group">
                    <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-5xl font-serif font-bold text-primary/20">{c.city.charAt(0)}</span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium">{c.memberCount} {t.centers.members}</span>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-serif font-bold text-xl mb-1">{c.name}</h3>
                      {c.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{c.description}</p>}
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                          <span>{c.address}, {c.city}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4 shrink-0 text-primary" />
                          <span>{c.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4 shrink-0 text-primary" />
                          <span>{c.email}</span>
                        </div>
                      </div>
                      {c.adminName && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-xs text-muted-foreground">{t.centers.centerManager}: <span className="font-medium text-foreground">{c.adminName}</span></p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
