import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Truck, BarChart3, Shield, Fuel, ArrowRight } from "lucide-react";

const SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&q=80",
    title: "Smart Fleet Operations",
    subtitle: "Manage your entire fleet from one powerful dashboard.",
  },
  {
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80",
    title: "Dispatch & Track Trips",
    subtitle: "Real-time trip management with capacity and licence validation.",
  },
  {
    image: "https://images.unsplash.com/photo-1632823471565-1ecdf5c6dc4b?w=1200&q=80",
    title: "Drive Smarter Operations",
    subtitle: "Analytics, maintenance tracking and cost management — all in one place.",
  },
];

const FEATURES = [
  { icon: Truck, title: "Fleet Management", desc: "Register vehicles and drivers with live status tracking." },
  { icon: BarChart3, title: "Analytics & Reports", desc: "ROI, fuel efficiency and safety analytics at your fingertips." },
  { icon: Shield, title: "Safety Compliance", desc: "License tracking, driver scores and compliance alerts." },
  { icon: Fuel, title: "Cost Tracking", desc: "Fuel, maintenance and expense tracking per vehicle." },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="flex items-center justify-between border-b border-border px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-ink-900">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-bold">TransitOps</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Fleet Control
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Register Now</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Carousel */}
      <section className="relative mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="overflow-hidden rounded-2xl">
          <Carousel className="w-full">
            <CarouselContent>
              {SLIDES.map((slide, i) => (
                <CarouselItem key={i}>
                  <div className="relative h-[400px] w-full overflow-hidden rounded-2xl lg:h-[500px]">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-8 lg:p-12">
                      <h2 className="font-display text-3xl font-extrabold text-white lg:text-5xl">
                        {slide.title}
                      </h2>
                      <p className="mt-3 max-w-lg text-lg text-zinc-300">
                        {slide.subtitle}
                      </p>
                      <Button size="lg" className="mt-6" asChild>
                        <Link to="/signup">
                          Register Now <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-center font-display text-2xl font-bold lg:text-3xl">
          Everything you need to run your fleet
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          Build your fleet, manage your vehicles and drive smarter operations.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 text-card-foreground"
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} TransitOps &middot; Smart Transport
        Operations Platform
      </footer>
    </div>
  );
}
