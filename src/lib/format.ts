export const unitLabel = (unit: string, count = 1, locale = "en") =>
  locale === "bn"
    ? { box: "বাক্স", piece: "টি", set: "সেট", pack: "প্যাক" }[unit] || unit
    : count === 1
      ? unit
      : unit === "box"
        ? "boxes"
        : `${unit}s`;
export const money = (paisa: number) =>
  "৳" +
  new Intl.NumberFormat("en-BD", { maximumFractionDigits: 2 }).format(
    paisa / 100,
  );
export const date = (value: string | Date) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
export const categories = [
  { id: "tiles", en: "Tiles & stone", bn: "টাইলস ও পাথর", icon: "tiles" },
  { id: "sanitary", en: "Sanitaryware", bn: "স্যানিটারি", icon: "bath" },
  { id: "doors", en: "Doors & windows", bn: "দরজা ও জানালা", icon: "door" },
  { id: "lighting", en: "Lighting", bn: "বাতি", icon: "light" },
  { id: "flooring", en: "Flooring", bn: "মেঝের উপকরণ", icon: "floor" },
  {
    id: "fixtures",
    en: "Fittings & more",
    bn: "ফিটিংস ও অন্যান্য",
    icon: "tool",
  },
];
export const conditionLabel = (value: string, locale = "en") =>
  ({
    UNOPENED: locale === "bn" ? "অখোলা" : "Unopened",
    UNUSED: locale === "bn" ? "অব্যবহৃত" : "Unused",
    USED_GOOD: locale === "bn" ? "ব্যবহৃত · ভালো" : "Used · good",
  })[value] || value;
