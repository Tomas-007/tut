/**
 * Каталог офферов (основные).
 * Запасные не здесь: fin5 → затем Т-Заем (см. FALLBACKS).
 */
export const OFFERS = [
  {
    id: "moneyman",
    title: "MoneyMan",
    url: "https://lig.su/a7T",
    logo: "moneyman.png",
    min: 1500,
    max: 100000,
    zeroFirst: true,
    priority: true,
    blurb: "первый до 30к — 0%, до 100к повторным",
  },
  {
    id: "webzaim",
    title: "Веб-Займ",
    url: "https://lig.su/a7R",
    logo: "webzaim.png",
    min: 1500,
    max: 30000,
    zeroFirst: true,
    blurb: "первый 0%, 7–30 дн.",
  },
  {
    id: "zaymer",
    title: "Займер",
    url: "https://lig.su/a7U",
    logo: "zaymer.png",
    min: 2000,
    max: 30000,
    zeroFirst: true,
    blurb: "первый 0%, повтор 0.8%",
  },
  {
    id: "alfadengi",
    title: "Альфа Деньги",
    url: "https://lig.su/a7W",
    logo: "alfadengi.png",
    min: 2000,
    max: 50000,
    zeroFirst: true,
    blurb: "первый 0% на 7–21 день",
  },
  {
    id: "bystrodengi",
    title: "Быстроденьги",
    url: "https://lig.su/a7Y",
    logo: "bystrodengi.png",
    min: 3000,
    max: 40000,
    zeroFirst: true,
    blurb: "первый 0% на 10 дней",
  },
  {
    id: "kekas",
    title: "Кекас.ру",
    url: "https://lig.su/a7Z",
    logo: "kekas.png",
    min: 1000,
    max: 30000,
    zeroFirst: true,
    blurb: "0–0.8% в день",
  },
  {
    id: "maxcredit",
    title: "Max Credit",
    url: "https://lig.su/a7X",
    logo: "maxcredit.png",
    min: 5000,
    max: 30000,
    zeroFirst: false,
    blurb: "первый до 7к",
  },
  {
    id: "dozarplaty",
    title: "До Зарплаты",
    url: "https://lig.su/a80",
    logo: "dozarplaty.png",
    min: 1000,
    max: 100000,
    zeroFirst: true,
    blurb: "до 100к, срок до года",
  },
  {
    id: "platiza",
    title: "Platiza",
    url: "https://lig.su/a82",
    logo: "platiza.png",
    min: 1000,
    max: 100000,
    zeroFirst: true,
    blurb: "до 100к, первый до 15к",
  },
];

/** Цепочка после «Не взял»: сначала Fin5, потом Т-Заем. */
export const FALLBACKS = [
  {
    id: "fin5",
    title: "Fin5",
    url: "https://lig.su/a84",
    logo: "fin5.png",
    blurb: "2 000 – 30 000 ₽, 16–31 день",
  },
  {
    id: "tzaem",
    title: "Т-Заем",
    url: "https://lig.su/a83",
    logo: "tzaem.png",
    blurb: "1 000 – 500 000 ₽, 1–365 дней, 21–80 лет",
  },
];

/**
 * Подходящие под сумму.
 * ≤30к → офферы до 50к лимита + приоритет MoneyMan.
 * >30к → только те, у кого лимит покрывает сумму.
 */
export function offersForAmount(amount) {
  const list = OFFERS.filter((o) => {
    if (amount < o.min || amount > o.max) return false;
    if (amount <= 30000) return o.max <= 50000 || o.priority;
    return o.max > 30000;
  });

  return list.sort((a, b) => {
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    if (a.zeroFirst !== b.zeroFirst) return a.zeroFirst ? -1 : 1;
    return a.max - b.max;
  });
}

/** Группы для текста: беспроцентные / до 30к / до 100к. */
export function groupOffers(list, amount) {
  if (amount <= 30000) {
    const zero = list.filter((o) => o.zeroFirst);
    const rest = list.filter((o) => !o.zeroFirst);
    return {
      headline: `Под сумму ${format(amount)} ₽ — до 30 000 и беспроцентные`,
      sections: [
        { title: "⭐ Беспроцентные (первый займ)", items: zero },
        { title: "До 30 000 ₽", items: rest },
      ].filter((s) => s.items.length),
    };
  }

  return {
    headline: `Под сумму ${format(amount)} ₽ — варианты до 100 000`,
    sections: [{ title: "До 100 000 ₽", items: list }].filter((s) => s.items.length),
  };
}

function format(n) {
  return new Intl.NumberFormat("ru-RU").format(n);
}
