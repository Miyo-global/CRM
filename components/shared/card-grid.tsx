import * as React from "react";
import { cn } from "@/lib/utils";

type Cols = 1 | 2 | 3 | 4 | 5 | 6;

interface CardGridProps {
  children: React.ReactNode;
  cols?: Cols;
  mdCols?: Cols;
  lgCols?: Cols;
  xlCols?: Cols;
  className?: string;
}

const colsMap: Record<Cols, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};
const mdMap: Record<Cols, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};
const lgMap: Record<Cols, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};
const xlMap: Record<Cols, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
};

export function CardGrid({
  children,
  cols = 1,
  mdCols,
  lgCols,
  xlCols,
  className,
}: CardGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 items-stretch",
        colsMap[cols],
        mdCols && mdMap[mdCols],
        lgCols && lgMap[lgCols],
        xlCols && xlMap[xlCols],
        className
      )}
    >
      {children}
    </div>
  );
}
