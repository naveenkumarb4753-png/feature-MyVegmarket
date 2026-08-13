import { produceImageSource, type ProduceImageStage } from "@/lib/produceUi";
import { Image, type ImageStyle } from "expo-image";
import React, { useMemo, useState } from "react";
import type { StyleProp } from "react-native";

type Props = {
  title?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: "cover" | "contain" | "fill";
};

export default function ProduceImage({
  title,
  category,
  imageUrl,
  style,
  contentFit = "cover",
}: Props) {
  const initialStage: ProduceImageStage = imageUrl ? "remote" : "local";
  const [stage, setStage] = useState<ProduceImageStage>(initialStage);

  const source = useMemo(
    () => produceImageSource(title, category, imageUrl, stage),
    [title, category, imageUrl, stage]
  );

  function handleError() {
    setStage((current) => {
      if (current === "remote") return "local";
      if (current === "local") return "fallback";
      return current;
    });
  }

  return <Image source={source} style={style} contentFit={contentFit} onError={handleError} />;
}
