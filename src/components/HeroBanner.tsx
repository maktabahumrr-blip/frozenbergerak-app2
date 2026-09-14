import React from "react";
import defaultHeroBanner from "../assets/images/hero_food_collage_1787666504223.jpg";

interface HeroBannerProps {
  bannerUrl?: string;
  className?: string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  bannerUrl,
  className = "",
}) => {
  const [activeUrl, setActiveUrl] = React.useState<string>(() => {
    if (bannerUrl && bannerUrl !== defaultHeroBanner) return bannerUrl;
    try {
      const saved = localStorage.getItem("frozen_custom_hero_banner") || localStorage.getItem("custom_hero_banner");
      if (saved) return saved;
    } catch {}
    return bannerUrl || defaultHeroBanner;
  });

  React.useEffect(() => {
    if (bannerUrl) {
      setActiveUrl(bannerUrl);
    }
  }, [bannerUrl]);

  React.useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail?.url) {
        setActiveUrl(e.detail.url);
      }
    };
    window.addEventListener("frozen_banner_updated" as any, handleUpdate);
    return () => window.removeEventListener("frozen_banner_updated" as any, handleUpdate);
  }, []);

  return (
    <section 
      id="hero-banner" 
      className={`w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[2.4/1] lg:aspect-[2.5/1] relative flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm sm:shadow-md border border-slate-200/90 bg-slate-100 ${className}`}
    >
      <img
        src={activeUrl}
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

