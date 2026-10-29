/**
 * Cycle & Menstrual Phase Calculator Helper
 * Provides exact local-date parsing, cycle projection, accurate next period dates,
 * and comprehensive partner care advice with calendar date ranges.
 */

/**
 * Safely parse a date string (YYYY-MM-DD or ISO) into local midnight Date
 * Avoids UTC timezone conversion shifts.
 */
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return null
  if (dateStr instanceof Date) {
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate())
  }
  const cleanStr = String(dateStr).split('T')[0].trim()
  const parts = cleanStr.split('-')
  if (parts.length !== 3) {
    const fallback = new Date(dateStr)
    return isNaN(fallback.getTime())
      ? null
      : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate())
  }
  const [y, m, d] = parts.map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return new Date(y, m - 1, d)
}

/**
 * Formats a local Date object into 'YYYY-MM-DD'
 */
export const formatLocalDate = (date) => {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Adds integer days to a Date object safely
 */
export const addDays = (date, days) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() + Number(days))
  return result
}

/**
 * Formats a Date object for human reading (e.g. "Oct 25" or "Mon, Nov 2, 2026")
 */
export const formatHumanDate = (date, options = { month: 'short', day: 'numeric' }) => {
  if (!date) return ''
  const d = date instanceof Date ? date : parseLocalDate(date)
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, options)
}

/**
 * Format a human readable date range (e.g., "Oct 25 – Oct 29")
 */
export const formatDateRange = (startDate, endDate, includeYear = false) => {
  if (!startDate || !endDate) return ''
  const startStr = formatHumanDate(startDate, { month: 'short', day: 'numeric' })
  const endStr = formatHumanDate(
    endDate,
    includeYear
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : { month: 'short', day: 'numeric' }
  )
  return `${startStr} – ${endStr}`
}

/**
 * Calculate comprehensive cycle phases, accurate next period date, and what to do with dates.
 */
export const calculateCyclePhases = ({
  lastPeriodDateStr,
  cycleLength = 28,
  periodDuration = 5,
  currentDate = new Date(),
}) => {
  if (!lastPeriodDateStr) return null

  const lastPeriod = parseLocalDate(lastPeriodDateStr)
  if (!lastPeriod || isNaN(lastPeriod.getTime())) return null

  const today = parseLocalDate(currentDate) || new Date()
  today.setHours(0, 0, 0, 0)
  lastPeriod.setHours(0, 0, 0, 0)

  // Enforce numbers
  const cLength = Math.max(20, Math.min(45, Number(cycleLength) || 28))
  const pDuration = Math.max(2, Math.min(10, Number(periodDuration) || 5))

  // Difference in calendar days from last period start date to today
  const diffTime = today.getTime() - lastPeriod.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  // If last period is in the future
  if (diffDays < 0) {
    const daysUntilLogged = Math.abs(diffDays)
    return {
      isFuture: true,
      lastPeriodDate: lastPeriod,
      cycleLength: cLength,
      periodDuration: pDuration,
      daysUntilLogged,
      currentDay: 0,
      nextPeriodDate: lastPeriod,
      daysUntilNextPeriod: daysUntilLogged,
      phase: {
        id: 'upcoming',
        name: 'Upcoming Period Logged ⏳',
        shortName: 'Upcoming',
        color: 'rose',
        badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        description: `You have logged her period to begin in ${daysUntilLogged} days.`,
        energyLevel: 'Normal',
        guyCareTip: 'Keep comfort supplies, hot water bag, and soothing tea ready for her upcoming cycle.',
        whatToDo: [
          { icon: '🍵', title: 'Prepare Comforts', desc: 'Stock her favorite tea, soothing chocolates, and make sure the heating pad is ready.' },
          { icon: '💖', title: 'Gentle Support', desc: 'Check in with her lovingly about how she feels.' },
        ],
        datesText: formatHumanDate(lastPeriod, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      },
      allPhases: [],
    }
  }

  // Determine active cycle start and cycle day
  let activeCycleStart = new Date(lastPeriod)
  let currentDay = diffDays + 1
  let isOverdue = false
  let daysOverdue = 0
  let isProjectedCycle = false
  let projectedCycleIndex = 1

  // Next Period Date calculation
  // Biological rule: The first cycle starts on lastPeriod (Day 1) and lasts cLength days (Day 1 to cLength).
  // Day cLength + 1 is the start of the NEXT period!
  let nextPeriodDate = addDays(lastPeriod, cLength)
  let daysUntilNextPeriod = Math.round((nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === cLength) {
    // Exactly on the expected period day!
    daysUntilNextPeriod = 0
  } else if (diffDays > cLength && diffDays < cLength + 7) {
    // 1 to 6 days late / overdue
    isOverdue = true
    daysOverdue = diffDays - cLength
    daysUntilNextPeriod = 0
  } else if (diffDays >= cLength + 7) {
    // More than a week has passed without an update (project subsequent cycles)
    const cyclesElapsed = Math.floor(diffDays / cLength)
    projectedCycleIndex = cyclesElapsed + 1
    isProjectedCycle = true
    activeCycleStart = addDays(lastPeriod, cyclesElapsed * cLength)
    currentDay = (diffDays % cLength) + 1
    nextPeriodDate = addDays(activeCycleStart, cLength)
    daysUntilNextPeriod = Math.round((nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Key cycle milestones for active cycle
  // Ovulation typically occurs 14 days before the end of the cycle
  const ovulationDay = Math.max(pDuration + 1, cLength - 14)
  const fertileWindowStart = Math.max(pDuration + 1, ovulationDay - 4) // 5 days before ovulation
  const fertileWindowEnd = Math.min(cLength, ovulationDay + 1) // 1 day after ovulation

  // Dates for active cycle
  const menstrualStartDate = activeCycleStart
  const menstrualEndDate = addDays(activeCycleStart, pDuration - 1)

  const follicularStartDate = addDays(activeCycleStart, pDuration)
  const follicularEndDate = addDays(activeCycleStart, fertileWindowStart - 2)

  const ovulationStartDate = addDays(activeCycleStart, fertileWindowStart - 1)
  const ovulationEndDate = addDays(activeCycleStart, fertileWindowEnd - 1)
  const peakOvulationDate = addDays(activeCycleStart, ovulationDay - 1)

  const lutealStartDate = addDays(activeCycleStart, fertileWindowEnd)
  const lutealEndDate = addDays(activeCycleStart, cLength - 1)

  // 1. Menstrual Phase Definition
  const menstrualPhase = {
    id: 'menstrual',
    number: 1,
    name: 'Menstrual Phase 🩸',
    shortName: 'Menstruation',
    color: 'rose',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    daysText: `Days 1–${pDuration}`,
    startDate: menstrualStartDate,
    endDate: menstrualEndDate,
    datesText: formatDateRange(menstrualStartDate, menstrualEndDate),
    description:
      'The uterine lining is shedding. Estrogen and progesterone are at baseline levels. Her body is working hard, and physical energy may dip with cramps or fatigue.',
    energyLevel: 'Low (Rest & Rejuvenation)',
    morningBrief: 'Her period is active. Her body is working hard and needs gentle warmth and extra comfort.',
    quickTip: 'Bring her warm herbal tea, keep her heating pad ready, and offer a soothing massage.',
    whatToDo: [
      {
        icon: '🍵',
        title: 'Warm Drinks & Comfort Food',
        desc: 'Bring her hot chamomile or ginger tea, warm cocoa, or warm vegetable/chicken soup. Keep dark chocolate within easy reach.',
      },
      {
        icon: '♨️',
        title: 'Heating Pad & Cramp Relief',
        desc: 'Plug in her heating pad or prepare a warm hot-water bag for her lower tummy and back before she even asks.',
      },
      {
        icon: '💆‍♂️',
        title: 'Gentle Massage & Touch',
        desc: 'Offer a tender lower back, shoulder, or foot massage to ease muscle contractions and release comforting oxytocin.',
      },
      {
        icon: '🛋️',
        title: 'Quietly Take Over Chores',
        desc: 'Handle the dishes, tidy the house, and take cooking or errands off her shoulders completely today.',
      },
      {
        icon: '🛌',
        title: 'Cozy Naps & Low-Key Vibes',
        desc: 'Cancel draining outings. Put on extra fluffy blankets, dim the lights, and cuddle up for a relaxing movie.',
      },
    ],
  }

  // 2. Follicular Phase Definition
  const follicularPhase = {
    id: 'follicular',
    number: 2,
    name: 'Follicular Phase 🌱',
    shortName: 'Follicular',
    color: 'emerald',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    daysText: `Days ${pDuration + 1}–${fertileWindowStart - 1}`,
    startDate: follicularStartDate,
    endDate: follicularEndDate,
    datesText: formatDateRange(follicularStartDate, follicularEndDate),
    description:
      'Follicle-stimulating hormone (FSH) and estrogen are rising steadily. Brain dopamine and serotonin climb, bringing renewed energy, optimism, mental focus, and curiosity.',
    energyLevel: 'Rising & High (Creative & Social)',
    morningBrief: 'Her estrogen is climbing! She is feeling refreshed, optimistic, and mentally sharp.',
    quickTip: 'Surprise her with a fun spontaneous date, outdoor walk, or brainstorm dream projects together.',
    whatToDo: [
      {
        icon: '🏃‍♀️',
        title: 'Active Dates & Outdoor Walks',
        desc: 'She has vibrant physical energy! Go for an afternoon walk, hike, try a workout together, or explore a new neighborhood.',
      },
      {
        icon: '🍽️',
        title: 'Fresh & Vibrant Meals',
        desc: 'Cook fresh, colorful foods together—crisp salads, avocados, lean proteins, and citrus fruits match her rising metabolism.',
      },
      {
        icon: '💡',
        title: 'Brainstorm & Dream Together',
        desc: 'Her mind is sharp and creative right now. Discuss future vacation ideas, bucket list plans, and new creative projects.',
      },
      {
        icon: '🎉',
        title: 'Spontaneous Surprises',
        desc: 'Her mood is adventurous and open. Surprise her with tickets to a show or a spontaneous evening dinner date.',
      },
    ],
  }

  // 3. Ovulation Phase Definition
  const ovulationPhase = {
    id: 'ovulation',
    number: 3,
    name: currentDay === ovulationDay ? 'Peak Ovulation Day ✨' : 'Fertile Ovulation Window 🌸',
    shortName: 'Ovulation',
    color: 'purple',
    badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    daysText: `Days ${fertileWindowStart}–${fertileWindowEnd} (Peak: Day ${ovulationDay})`,
    startDate: ovulationStartDate,
    endDate: ovulationEndDate,
    peakDate: peakOvulationDate,
    datesText: `${formatDateRange(ovulationStartDate, ovulationEndDate)} (Peak: ${formatHumanDate(peakOvulationDate)})`,
    description:
      'Luteinizing Hormone (LH) surge triggers the release of an egg. Estrogen and testosterone reach their monthly peak, boosting natural skin glow, confidence, charisma, and romantic affection.',
    energyLevel: 'Peak (Radiant, Flirty & Magnetic)',
    morningBrief: 'She is at her monthly peak of glow, magnetic radiance, and romantic confidence!',
    quickTip: 'Shower her with compliments, tell her how gorgeous she is, and plan a romantic dinner together.',
    whatToDo: [
      {
        icon: '💐',
        title: 'Heartfelt Compliments & Flirting',
        desc: 'Tell her how breathtaking and radiant she looks today. Give her passionate kisses and remind her how desired she is.',
      },
      {
        icon: '🕯️',
        title: 'Intimate Candlelit Date',
        desc: 'Dress up and take her out for romantic dinner, or light candles at home with soft music and slow dancing.',
      },
      {
        icon: '💌',
        title: 'Romantic Love Notes',
        desc: 'Hide a handwritten love note in her bag or send her a sweet affectionate message expressing your love.',
      },
      {
        icon: '🛡️',
        title: 'Fertility Awareness',
        desc: 'This is her highest biological chance of conception. Keep this in mind whether trying to conceive or avoiding pregnancy.',
      },
    ],
  }

  // 4. Luteal Phase Definition
  const lutealPhase = {
    id: 'luteal',
    number: 4,
    name: currentDay >= cLength - 6 ? 'Late Luteal (PMS Care) 🌙' : 'Luteal Phase (Cozy Nesting) 🌿',
    shortName: 'Luteal',
    color: 'amber',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    daysText: `Days ${fertileWindowEnd + 1}–${cLength}`,
    startDate: lutealStartDate,
    endDate: lutealEndDate,
    datesText: formatDateRange(lutealStartDate, lutealEndDate),
    description:
      'Progesterone rises to support the body, then gradually dips. Her basal metabolic rate increases (burning up to 10% more calories). She may feel sensitive, hungrier, bloated, or desire extra emotional warmth.',
    energyLevel: 'Winding Down (Sensitive, Hungry & Cozy)',
    morningBrief: 'Her body is burning extra energy and progesterone is shifting. She may feel emotionally tender.',
    quickTip: 'Be extra patient, stock her favorite comfort snacks, and validate her feelings with big hugs.',
    whatToDo: [
      {
        icon: '🫂',
        title: 'Infinite Patience & Empathy',
        desc: 'Her emotions may feel tender or heightened. Never argue or take mood changes personally—respond with warmth, patience, and hugs.',
      },
      {
        icon: '🍿',
        title: 'Stock Comfort Snacks & Cravings',
        desc: 'Her body burns more calories now and craves carbs and fats. Stock the pantry with her favorite chips, ice cream, pasta, and sweets.',
      },
      {
        icon: '👂',
        title: 'Listen Without Fixing',
        desc: 'If she vents or feels overwhelmed, listen with full attention, hold her hand, and validate her feelings rather than offering logical debate.',
      },
      {
        icon: '🚫',
        title: 'Avoid Stressful Discussions',
        desc: 'Postpone stressful debates or high-conflict topics until after her cycle. Keep today peaceful, reassuring, and calm.',
      },
      {
        icon: '😴',
        title: 'Ensure Deep Rest',
        desc: 'Tuck her in early with cozy blankets, keep the bedroom comfortably cool, and provide a peaceful sanctuary.',
      },
    ],
  }

  const allPhases = [menstrualPhase, follicularPhase, ovulationPhase, lutealPhase]

  // Determine current active phase based on currentDay
  let activePhase = {}
  if (isOverdue) {
    activePhase = {
      id: 'overdue',
      number: 5,
      name: `Period Overdue (${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}) 🩸`,
      shortName: 'Overdue',
      color: 'rose',
      badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse',
      daysText: `Day ${currentDay} of ${cLength}`,
      datesText: `Expected around ${formatHumanDate(nextPeriodDate)}`,
      description: `Her period was expected ${daysOverdue === 1 ? 'yesterday' : `${daysOverdue} days ago`}. Cycle variations of a few days are completely normal due to stress, travel, or hormonal shifts.`,
      energyLevel: 'Sensitive & Waiting',
      morningBrief: `Her period is ${daysOverdue} days overdue. Check in gently and keep comfort essentials ready.`,
      quickTip: 'Keep comfort supplies ready and check in gently on how she is feeling today.',
      whatToDo: [
        {
          icon: '🩸',
          title: 'Period Started Today?',
          desc: 'If her period began today, tap "Period Started Today" button to reset the cycle and keep predictions 100% accurate.',
        },
        {
          icon: '🍵',
          title: 'Comfort & Hydration',
          desc: 'Keep warm chamomile or raspberry leaf tea, hot water bag, and comfort snacks ready.',
        },
        {
          icon: '💖',
          title: 'Reassurance',
          desc: 'Cycles naturally fluctuate by a few days. Reassure her, give warm hugs, and remove any pressure or stress.',
        },
      ],
    }
  } else if (daysUntilNextPeriod === 0) {
    activePhase = {
      id: 'due_today',
      number: 1,
      name: 'Period Expected Today 🩸',
      shortName: 'Due Today',
      color: 'rose',
      badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
      daysText: `Day ${cLength} (Cycle Completion)`,
      datesText: `Today, ${formatHumanDate(today, { month: 'short', day: 'numeric', weekday: 'short' })}`,
      description: 'Based on her cycle length, her next period is estimated to arrive today. Keep care essentials ready!',
      energyLevel: 'Tender & Low Energy',
      morningBrief: 'Her period is estimated to arrive today! Keep her heating pad and comfort drinks nearby.',
      quickTip: 'Ask how she feels, have pads/comfort essentials ready, and make her day peaceful.',
      whatToDo: menstrualPhase.whatToDo,
    }
  } else if (currentDay <= pDuration) {
    activePhase = menstrualPhase
  } else if (currentDay < fertileWindowStart) {
    activePhase = follicularPhase
  } else if (currentDay >= fertileWindowStart && currentDay <= fertileWindowEnd) {
    activePhase = ovulationPhase
  } else {
    activePhase = lutealPhase
  }

  // Next Ovulation date calculation
  let nextOvulationDate = peakOvulationDate
  let daysUntilOvulation = Math.round((peakOvulationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilOvulation < 0) {
    // If peak ovulation already passed in current cycle, project for next cycle
    nextOvulationDate = addDays(nextPeriodDate, ovulationDay - 1)
    daysUntilOvulation = Math.round((nextOvulationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  return {
    lastPeriodDate: lastPeriod,
    activeCycleStart,
    currentDay,
    cycleLength: cLength,
    periodDuration: pDuration,
    ovulationDay,
    fertileWindowStart,
    fertileWindowEnd,
    phase: activePhase,
    allPhases,
    daysUntilNextPeriod,
    nextPeriodDate,
    daysUntilOvulation,
    nextOvulationDate,
    isOverdue,
    daysOverdue,
    isProjectedCycle,
    projectedCycleIndex,
  }
}
