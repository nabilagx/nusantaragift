
"use client";

import {
  BookOpen,
  Utensils,
  Sparkles,
} from "lucide-react";

export type ShopCategory = "Cerita" | "Rasa" | "Budaya";

type CategoryTabsProps = {
  activeCategory: ShopCategory;
  setActiveCategory: (category: ShopCategory) => void;
};

const categories = [
  { name: "Cerita", icon: BookOpen },
  { name: "Rasa", icon: Utensils },
  { name: "Budaya", icon: Sparkles },
] as const;

export default function CategoryTabs({
  activeCategory,
  setActiveCategory,
}: CategoryTabsProps) {
  return (
    <section className="w-full overflow-hidden bg-[#F7F1E3]">
      <div className="flex w-full items-center justify-center gap-10 px-2">
        {categories.map(({ name, icon: Icon }) => {
          const active = activeCategory === name;

          return (
            <button
              key={name}
              type="button"
              onClick={() => setActiveCategory(name)}
              aria-pressed={active}
              className={`relative flex shrink-0 flex-col items-center gap-3 pt-1 pb-3 text-[18px] font-bold transition-colors duration-200 ${
                active
                  ? "text-[#93372A]"
                  : "text-[#93372A]/50 hover:text-[#93372A]"
              }`}
            >
              <Icon size={26} strokeWidth={2} />
              <span>{name}</span>

              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[#93372A]" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
