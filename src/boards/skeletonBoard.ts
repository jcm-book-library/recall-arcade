import { pictureBoard } from "./pictureBoard";

/** The skeleton picture: one of the pictures drawn by pictureBoard.ts. */
export const createSkeletonBoard = pictureBoard({
  load: () => import("../assets/skeleton-front.svg?raw"),
  label: "Human skeleton, front view",
  credit: "Skeleton illustration: LadyofHats, public domain, via Wikimedia Commons",
  axis: "sternum",
});
