import type { EventType } from "@/lib/types";

export const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; emoji: string; coverEmojis: string[]; venue: string }
> = {
  travel:   { label: "Family Trip",          emoji: "✈️", coverEmojis: ["✈️","🏖️","🏔️","🏕️","🌍","🗺️","🚢","🚂","🏝️","🎒","🗽","🏯"], venue: "Destination" },
  visit:    { label: "Visit",                emoji: "🏠", coverEmojis: ["🏠","🤝","👨‍👩‍👧‍👦","🚗","🛣️","🌺","🏡","🚌","🎁","🫂","🍽️","🌿"], venue: "Where" },
  wedding:  { label: "Wedding / Ceremony",   emoji: "💍", coverEmojis: ["💍","👰","🤵","💒","🌹","💐","🥂","🎊","🕊️","💫","🪷","🎶"], venue: "Venue" },
  event:    { label: "Event / Celebration",  emoji: "🎉", coverEmojis: ["🎉","🎊","🎈","🥳","🎆","🎇","🪅","🎭","🎪","🏟️","🎶","🌟"], venue: "Venue" },
  birthday: { label: "Birthday",             emoji: "🎂", coverEmojis: ["🎂","🎁","🎈","🧁","🎀","🪅","🥳","🎠","🎡","🎢","🎯","🌈"], venue: "Location" },
  school:   { label: "School Event",         emoji: "🎓", coverEmojis: ["🎓","📚","🏫","📝","✏️","🏆","🎒","📖","🔬","🏅","🌟","🖊️"], venue: "School / Venue" },
  religious:{ label: "Religious / Cultural", emoji: "🙏", coverEmojis: ["🙏","⛪","🕌","🌿","✨","🕊️","🌙","🪔","🌸","🎋","🫶","🕍"], venue: "Location" },
  other:    { label: "Other",                emoji: "📅", coverEmojis: ["📅","🗓️","⭐","🌟","💫","✨","🎯","📌","🎪","🌈","🎨","🎵"], venue: "Location" },
};
