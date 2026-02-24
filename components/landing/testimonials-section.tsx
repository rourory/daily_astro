"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const t = useTranslations("TestimonialsSection");

  const testimonials = t.raw("testimonials") as {
    id: string;
    name: string;
    zodiac: string;
    text: string;
    rating: number;
  }[];

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    );
  };

  return (
    <section className="py-24 bg-card/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl font-medium mb-4">
            {t("what_they_say")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("over_1000_happy_users")}
          </p>
        </div>

        {/* Desktop: Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.slice(0, 3).map((testimonial) => (
            <Card
              key={testimonial.id}
              className="bg-card border-border/50 hover:border-primary/30 transition-colors"
            >
              <CardContent className="pt-6">
                <Quote className="w-8 h-8 text-primary/30 mb-4" />
                <p className="text-sm mb-4 leading-relaxed">
                  {testimonial.text}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.zodiac}
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-primary text-primary"
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile: Carousel */}
        <div className="md:hidden max-w-sm mx-auto">
          <Card className="bg-card border-border/50">
            <CardContent className="pt-6">
              <Quote className="w-8 h-8 text-primary/30 mb-4" />
              <p className="text-sm mb-4 leading-relaxed">
                {testimonials[currentIndex].text}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {testimonials[currentIndex].name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonials[currentIndex].zodiac}
                  </p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({
                    length: testimonials[currentIndex].rating,
                  }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-primary text-primary"
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={prevTestimonial}
              className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    i === currentIndex ? "bg-primary" : "bg-muted",
                  )}
                />
              ))}
            </div>
            <button
              onClick={nextTestimonial}
              className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
