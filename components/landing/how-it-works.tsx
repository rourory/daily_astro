import { UserCircle, CreditCard, MessageCircle, Sparkles } from "lucide-react"
import {getTranslations} from 'next-intl/server';

const steps = [
  {
    id: 1,
    icon: UserCircle,
  },
  {
    id: 2,
    icon: CreditCard,
  },
  {
    id: 3,
    icon: MessageCircle,
  },
]

export async function HowItWorks() {
  const t = await getTranslations('HowItWorks');

  const localizedSteps = t.raw("steps") as Array<{
    title: string;
    description: string;
    highlight: string;
  }>;
  
  const stepsWithIcons = steps.map((step, index) => ({
    ...step,
    ...localizedSteps[index],
  }));

  return (
    <section id="how-it-works" className="py-24 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">{t("simple_and_fast")}</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium mb-4">{t("how_it_works")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("follow_three_simple_steps")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {stepsWithIcons.map((step, index) => (
            <div key={step.title} className="relative group">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-px bg-gradient-to-r from-border via-primary/30 to-border" />
              )}

              <div className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-card/50 border border-transparent hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                {/* Step number */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg shadow-primary/30">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-10 h-10 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-medium mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm mb-3">{step.description}</p>

                {/* Highlight badge */}
                <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {step.highlight}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
