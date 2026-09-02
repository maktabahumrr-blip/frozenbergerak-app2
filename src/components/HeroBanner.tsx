import React from "react";
import defaultHeroBanner from "../assets/images/hero_food_collage_1787666504223.jpg";

interface HeroBannerProps {
  bannerUrl?: string;
  className?: string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  bannerUrl = defaultHeroBanner,
  className = "",
}) => {
  return (
    <section 
      id="hero-banner" 
      className={`w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[2.4/1] lg:aspect-[2.5/1] relative flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm sm:shadow-md border border-slate-200/90 bg-slate-100 ${className}`}
    >
      <img
        src={bannerUrl}
        alt="FrozenBergerak Banner"
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover object-center select-none"
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src !== defaultHeroBanner) {
            target.src = defaultHeroBanner;
          }
        }}
      />
    </section>
  );
};

