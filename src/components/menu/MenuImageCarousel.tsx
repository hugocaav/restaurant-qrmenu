"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";

interface MenuImageCarouselProps {
  images: string[];
  title: string;
}

export function MenuImageCarousel({ images, title }: MenuImageCarouselProps) {
  const safeImages = useMemo(
    () => images.filter((src): src is string => typeof src === "string" && src.trim().length > 0),
    [images]
  );
  const totalImages = safeImages.length;
  const hasImages = totalImages > 0;

  // Main carousel state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((idx: number) => emblaApi?.scrollTo(idx), [emblaApi]);

  return (
    <div className="space-y-3 w-full">
      <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-white to-primary/5">
        {hasImages ? (
          <>
            <div ref={emblaRef} className="w-full overflow-hidden min-h-[180px]">
              <div className="flex touch-pan-x select-none">
                {safeImages.map((src, idx) => (
                  <div
                    key={src + idx}
                    className="relative min-w-0 w-full"
                    style={{ flex: "0 0 100%" }}
                  >
                    <img
                      src={src}
                      alt={title}
                      style={{
                        width: "100%",
                        height: "220px",
                        objectFit: "cover",
                        background: "#eee",
                        display: "block",
                        borderRadius: "1.5rem",
                        marginBottom: "4px",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            {totalImages > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Anterior"
                  className="absolute left-1.5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-lg text-white shadow-lg ring-1 ring-black/20 backdrop-blur-lg sm:left-3"
                  onClick={scrollPrev}
                >‹</button>
                <button
                  type="button"
                  aria-label="Siguiente"
                  className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-lg text-white shadow-lg ring-1 ring-black/20 backdrop-blur-lg sm:right-3"
                  onClick={scrollNext}
                >›</button>
              </>
            )}
            {totalImages > 1 && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                {safeImages.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Ver imagen ${i + 1}`}
                    className={`h-1.5 w-6 rounded-full transition-all duration-200 ${selectedIndex === i ? 'bg-primary shadow-md' : 'bg-white/60 hover:bg-primary/70'} focus:outline-none`}
                    type="button"
                    onClick={() => scrollTo(i)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-[hsl(var(--muted-foreground))]">
            <span className="text-sm font-semibold uppercase tracking-[0.35em] text-[hsl(var(--foreground))]">
              Foto
            </span>
            <span className="text-xs">
              Añade imágenes desde el panel admin para reforzar la experiencia visual.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}