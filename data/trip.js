// Shared trip data for the Round-2 prototypes (K and L read the same object).
// Snapshot 2026-10-24. Everything marked approx is an author estimate awaiting the research pass.
window.TRIP = {
  title: "Thailand Research 26",
  dates: "17 to 24 November 2026",
  travellers: 5,
  rooms: 3,
  thaiGreeting: "ไปไหน",
  vibe: "Adventure, chilling, slight partying. Experience it properly like a local.",
  food: "Nice street food. A mix of good food and street food.",
  budgetRule: "Stays 3 to 5K a night. 5K max.",
  snapshot: "2026-10-24",

  places: {
    airport: { name: "Phuket Airport", thai: "สนามบินภูเก็ต", lngLat: [98.3169, 8.1132], zoom: 11 },
    phuket:  { name: "Phuket",  thai: "ภูเก็ต",   lngLat: [98.3400, 7.9300], zoom: 10.4 },
    patong:  { name: "Patong",  thai: "ป่าตอง",   lngLat: [98.2965, 7.8961], zoom: 12.5 },
    kata:    { name: "Kata",    thai: "กะตะ",     lngLat: [98.2980, 7.8200], zoom: 12.5 },
    oldtown: { name: "Phuket Old Town", thai: "เมืองเก่าภูเก็ต", lngLat: [98.3870, 7.8850], zoom: 13 },
    rassada: { name: "Rassada pier", thai: "ท่าเรือรัษฎา", lngLat: [98.4046, 7.8676], zoom: 13 },
    aonang:  { name: "Ao Nang", thai: "อ่าวนาง",  lngLat: [98.8229, 8.0319], zoom: 12.2 },
    krabi:   { name: "Krabi",   thai: "กระบี่",   lngLat: [98.9063, 8.0863], zoom: 11.5 },
    phiphi:  { name: "Ko Phi Phi", thai: "เกาะพีพี", lngLat: [98.7784, 7.7407], zoom: 12.5 }
  },

  // Approximate polylines for the map (not routed; the research pass replaces road legs with OSRM geometry).
  routes: [
    { id: "r1", kind: "road", from: "phuket", to: "aonang",
      coords: [[98.3923,7.8804],[98.3400,8.0000],[98.3169,8.1132],[98.3050,8.3000],[98.4300,8.4400],[98.5300,8.4500],[98.6200,8.4200],[98.7300,8.2700],[98.8000,8.1000],[98.8229,8.0319]] },
    { id: "r2", kind: "sea", from: "aonang", to: "phiphi",
      coords: [[98.8229,8.0319],[98.8000,7.9500],[98.7850,7.8300],[98.7784,7.7407]] },
    { id: "r3", kind: "sea", from: "phiphi", to: "rassada",
      coords: [[98.7784,7.7407],[98.6500,7.7800],[98.5000,7.8300],[98.4046,7.8676]] },
    { id: "r4", kind: "sea", from: "phiphi", to: "aonang",
      coords: [[98.7784,7.7407],[98.7600,7.8500],[98.7900,7.9600],[98.8229,8.0319]] }
  ],

  // Transport legs: options with approx durations/costs for 5 people, flagged until research lands.
  legs: [
    { id: "L1", from: "airport", to: "phuket", title: "Phuket Airport to the stay", hours: 1,
      options: [
        { mode: "Pre-booked private minivan", duration: "45 to 60 min, 90 in the 16:00 to 19:00 rush", costGroupTHB: 1350, note: "1,200 to 1,500 to Patong for the whole group, one vehicle.", source: "research/transport.md" },
        { mode: "Two Grabs or counter taxis", duration: "45 to 60 min", costGroupTHB: 1100, note: "400 to 700 per 4-seat car; you need two.", source: "research/transport.md" },
        { mode: "Smart Bus along the west coast", duration: "90 min+", costGroupTHB: 500, note: "To Patong, Kata, Karon. Luggage rule not confirmed.", source: "research/transport.md" }
      ] },
    { id: "L2", from: "phuket", to: "aonang", title: "Phuket to Ao Nang", hours: 3,
      options: [
        { mode: "Private minivan, door to door", duration: "2.5 to 3 h from Town or airport, 3 to 3.5 h from Patong", costGroupTHB: 3700, note: "3,500 for a 4 to 6 seat van, 3,900 for 7 to 9 (citytourphuket, fixed price). Leave 08:00 to 09:00, hotel to hotel by noon. The researcher's pick for five with bags.", source: "https://citytourphuket.com/phuket-to-krabi-transfer/ao-nang-transfer/" },
        { mode: "Shared minivan with hotel pickup", duration: "3 to 5 h with pickup loops", costGroupTHB: 3500, note: "340 to 950 per head, typically about 700. Five big bags may be refused; ask.", source: "https://www.geckoroutes.com/thailand/phuket-to-krabi/" },
        { mode: "Public bus from Bus Terminal 2", duration: "about 3 h plus two Grab legs, 4.5 to 5.5 h door to door", costGroupTHB: 2800, note: "385 per head on 12Go, 9 departures a day. Saves about 1,500 THB for the group, costs two hours and three vehicle changes.", source: "research/transport.md" },
        { mode: "Ao Nang Princess ferry from Rassada", duration: "10:30 sailing, about 2 h via Railay, Ao Nang 12:30; free hotel pickup adds 1 to 1.5 h", costGroupTHB: 4500, note: "850 to 900 per head, pickup in Patong, Kata, Karon or Town included. Runs on a Wednesday even on the low-season rota. Bags over 20 kg plus 100. Does not stop at Phi Phi.", source: "https://www.phuketferry.com/route-phuket-ao-nang.html" },
        { mode: "Speedboat Phuket to Ao Nang", duration: "about 1 h 30", costGroupTHB: 5250, note: "1,000 to 1,100 per head. First thing cancelled in weather.", source: "https://www.visitthailandtoday.com/guides/krabi-to-phuket" }
      ] },
    { id: "L3", from: "aonang", to: "phiphi", title: "Ao Nang to Ko Phi Phi", hours: 2,
      options: [
        { mode: "Shared speedboat day tour", duration: "pickup 08:00, boat 09:00, back 15:30 to 17:00", costGroupTHB: 10250, note: "1,350 to 2,000 per head plus 400 park fee cash. Bamboo, Pileh, Viking Cave, Maya walk, lunch.", source: "https://www.click2gothailand.com/tours/00019" },
        { mode: "Public ferry 09:20", duration: "1 h 10 to Tonsai", costGroupTHB: 4750, note: "850 to 1,050 per head on aggregators; 490 from Krabi Town (Songserm). Plus 20 pier fee.", source: "https://www.directferries.com/ao_nang_nopparat_thara_beach_koh_phi_phi_ferry.htm" },
        { mode: "Bundhaya speedboat 10:10 or 14:40", duration: "50 min", costGroupTHB: 4750, note: "Same fare band as the ferry, half the time, bumpier.", source: "https://www.directferries.com/ao_nang_nopparat_thara_beach_koh_phi_phi_ferry.htm" }
      ] },
    { id: "L4", from: "phiphi", to: "phuket", title: "Ko Phi Phi to Phuket", hours: 2,
      options: [
        { mode: "Big ferry to Rassada", duration: "09:00, 10:00, 11:00, 14:00, 14:30, 15:30; about 2 h", costGroupTHB: 3000, note: "500 to 700 per head. Book the 11:00: Phuket Town by 13:00. Safer than speedboats.", source: "https://www.visitthailandtoday.com/guides/phi-phi-to-phuket" },
        { mode: "Speedboat to Rassada", duration: "hourly-ish 08:30 to 17:00; about 1 h", costGroupTHB: 4000, note: "750 to 900 per head.", source: "https://www.visitthailandtoday.com/guides/phi-phi-to-phuket" },
        { mode: "Ferry plus van to Patong / Kata / Karon", duration: "about 3 h door to door", costGroupTHB: 3800, note: "680 to 950 per head as a bundle.", source: "https://www.visitthailandtoday.com/guides/phi-phi-to-phuket" }
      ] },
    { id: "L5", from: "aonang", to: "phuket", title: "Krabi to Phuket", hours: 3,
      options: [
        { mode: "Private car or minivan", duration: "2 h 20 to 3 h", costGroupTHB: 3350, note: "2,800 to 3,900 per car.", source: "https://www.visitthailandtoday.com/guides/krabi-to-phuket" },
        { mode: "Shared minivan", duration: "3 to 5 h", costGroupTHB: 3275, note: "530 to 780 per head.", source: "https://www.visitthailandtoday.com/guides/krabi-to-phuket" },
        { mode: "Minivan or VIP bus from Krabi bus terminal", duration: "about 3 h", costGroupTHB: 1450, note: "260 to 320 per head, plus a songthaew to the terminal.", source: "https://www.visitthailandtoday.com/guides/krabi-to-phuket" }
      ] }
  ],

  days: [
    { n: 1, date: "17 Nov", weekday: "Tuesday", base: "phuket", spend: "No need to spend a lot.",
      plan: ["Arrive in Phuket.", "Check in 3PM.", "Evening: night market, beach, some pub."],
      decisions: ["day1-hotel"], legs: ["L1"], reddit: "phuket",
      tips: ["Loy Krathong 2026 is Tuesday 24 November, your departure day. If the flight is late, Patong beach or Nai Harn in the evening."] },
    { n: 2, date: "18 Nov", weekday: "Wednesday", base: "aonang", spend: "",
      plan: ["Check in Krabi.", "Do Krabi stuff, maybe island tour."],
      decisions: ["aonang-stay", "day2-plan"], legs: ["L2"], reddit: "krabi",
      tips: ["Klong Haeng local market runs Wednesdays 16:00 to 21:00, 1.5 km from Ao Nang: the one local market you can actually hit.", "Krabi Town's walking street is Friday to Sunday only, so it is out unless you are still there Friday evening."] },
    { n: 3, date: "19 Nov", weekday: "Thursday", base: "phiphi", spend: "Spend.",
      plan: ["Transfer to Phi Phi early morning for snorkeling.", "Return to Krabi, do kayaking."],
      decisions: ["day3"], legs: ["L3"], reddit: "phiphi",
      tips: ["Maya Bay is open on your dates (reopened 1 Oct 2026): no swimming, about an hour per group, 400 THB park fee in cash, not in tour prices.", "Sunset on 19 Nov is 18:02. Nothing on the water fits after a 16:30 return."] },
    { n: 4, date: "20 Nov", weekday: "Friday", base: "phuket", spend: "Spend.",
      plan: ["Transfer to Phuket, stay in Phuket."],
      decisions: ["phuket-area"], legs: ["L4", "L5"], reddit: "phuket", tips: [] },
    { n: 5, date: "21 Nov", weekday: "Saturday", base: "phuket", spend: "", plan: ["Phuket."], decisions: [], legs: [], reddit: "phuket", tips: [] },
    { n: 6, date: "22 Nov", weekday: "Sunday", base: "phuket", spend: "Spend.", plan: ["Phuket."], decisions: [], legs: [], reddit: "phuket", tips: ["Sunday is Lard Yai walking street in Old Town, the one everyone recommends."] },
    { n: 7, date: "23 Nov", weekday: "Monday", base: "phuket", spend: "Spend.", plan: ["Phuket."], decisions: [], legs: [], reddit: "phuket", tips: [] },
    { n: 8, date: "24 Nov", weekday: "Tuesday", base: "airport", spend: "", plan: ["Fly back."], decisions: [], legs: ["L1"], reddit: "", tips: ["File the Thailand Digital Arrival Card 14 to 16 Nov (72 hours before landing), one per person, on the official portal only."] }
  ],

  decisions: [
    { id: "day1-hotel", title: "Where we sleep on night one", place: "phuket", kind: "stay",
      options: [
        { id: "horange", label: "Horange Phuket", costINR: 10300, unit: "night, 3 rooms", note: "6.5 km to pier.", url: "https://www.agoda.com/en-in/accom/property?propertyId=55611369" },
        { id: "pearl", label: "Pearl Hotel Phuket", costINR: 13000, unit: "night, 3 rooms", note: "6 km from pier.", url: "https://www.agoda.com/en-in/accom/property?propertyId=10919" },
        { id: "merlin", label: "Phuket Merlin Hotel", costINR: 14700, unit: "night, 3 rooms", note: "Pier side.", url: "https://www.agoda.com/en-in/accom/property?propertyId=48531" }
      ] },
    { id: "aonang-stay", title: "Ao Nang stay, two nights", place: "aonang", kind: "stay",
      options: [
        { id: "abnb4114674", label: "Ban Preeya Private Pool Villa (the Airbnb)", costINR: 38000, unit: "2 nights, 3 rooms, 3.5 bathrooms", note: "3 king en-suites, private pool, 4.92 from 64 reviews, Superhost. Na Thai, inland: a 5-minute drive to the beach and bars, so every outing is a Grab. Works out to about 6,330 INR per room-night, above the 5K cap.", url: "https://www.airbnb.co.in/rooms/4114674" },
        { id: "smoothsilk", label: "Smooth as Silk, 3-bedroom pool villa", costINR: 28600, unit: "2 nights, from about 170 USD a night", note: "3 king rooms, sleeps 6. From-price on Booking.com, not a quote for your dates. About 4,800 INR per room-night.", url: "https://www.booking.com/hotel/th/exclusive-private-pool-villa-smoth-as-silk.html" },
        { id: "nine", label: "Aonang Nine Poolvilla", costINR: 31800, unit: "2 nights, from about 189 USD a night", note: "3-bedroom villas near Ao Nang Beach, 6 guests. From-price, unverified for the dates.", url: "https://www.booking.com/hotel/th/the-nine-villa.html" },
        { id: "hotels", label: "Three hotel rooms on the strip", costINR: 0, unit: "price pending", note: "Anawin Bungalows (Ao Nang) or Doo Dee Boutique (Nopparat Thara, by the night market): walk to bars and the pier, no pool.", url: "https://www.indietraveller.co/where-to-stay-in-krabi/" }
      ] },
    { id: "day3", title: "Day 3: how we do Phi Phi", place: "phiphi", kind: "plan",
      options: [
        { id: "overnight", label: "Sleep one night on Phi Phi, ferry straight to Phuket on Friday", costINR: 62000, unit: "for five: boats, room, private longtail, park fee, ferry out, island food", note: "Research recommendation. Ferry 09:20 over, 14:00 to 18:00 private longtail to Pileh and Maya after the day boats leave, fire show at Slinky or Carlito's, 11:00 ferry to Phuket. Net about 11,000 to 25,000 INR more than the day trip once you drop the second Ao Nang night and the road transfer. Room under 1,780 THB in Tonsai back streets still to confirm." },
        { id: "daytrip", label: "Shared speedboat day trip, drop kayaking", costINR: 33400, unit: "for five: tour, park fee, drinks", note: "1,350 to 2,000 THB per head plus 400 park fee. Maya Bay at 10:30 with everyone else. Back in Ao Nang 15:30 to 17:00; kayaking after is not possible, sunset is 18:02." },
        { id: "earlybird", label: "Early-bird tour, 07:00 boat, Maya Bay almost empty", costINR: 38000, unit: "for five, plus park fee", note: "2,400 to 2,650 THB per head, 9 hours, Maya Bay at 07:45, then Pileh, Bamboo, Chicken Island. Keep Ao Nang as base." },
        { id: "hong", label: "Skip Phi Phi here: Hong Islands plus kayak, Phi Phi from Phuket later", costINR: 61000, unit: "for five, both days", note: "Only if kayaking is non-negotiable. Hong longtail plus kayak about 1,850 THB per head plus 300 park; Phuket Phi Phi tours 2,500 to 2,800 per head at the worst crowd slot." }
      ] },
    { id: "day2-plan", title: "Day 2 in Krabi: the research pick", place: "aonang", kind: "plan",
      options: [
        { id: "thalane", label: "Ao Thalane mangrove kayak, 13:00 pickup", costINR: 12600, unit: "for five, 800 to 1,000 THB per head", note: "Fits if you reach Ao Nang by 12:30. Back about 18:00, then Klong Haeng market (Wednesdays 16:00 to 21:00, 1.5 km away)." },
        { id: "fourisland", label: "4-island longtail tour", costINR: 20000, unit: "for five, about 1,000 to 1,500 THB walk-in plus park fee", note: "Poda, Chicken, Tup, Phra Nang. Needs a full day from 09:00, so only if you arrive the night before." },
        { id: "railay", label: "Railay afternoon: longtail over, Phra Nang beach, sunset, boat back", costINR: 2100, unit: "for five, 100 THB each way, 150 after 18:00", note: "Lowest effort. Shared boats wait for 8 people." }
      ] },
    { id: "phuket-area", title: "Phuket base for the four nights", place: "phuket", kind: "stay",
      options: [
        { id: "patong", label: "Patong", costINR: 0, unit: "", note: "Nightlife, Bangla Road, busiest beach. Price band pending." },
        { id: "kata", label: "Kata / Karon", costINR: 0, unit: "", note: "Calmer beaches, surf in season, short Grab to Patong. Price band pending." },
        { id: "oldtown", label: "Phuket Old Town", costINR: 0, unit: "", note: "Food, Sunday walking street, cheapest, no beach. Price band pending." },
        { id: "pier", label: "Pier side", costINR: 0, unit: "", note: "Only useful for a ferry morning." }
      ] }
  ],

  // Decisions: options the group can lock. costINR is for the group (3 rooms) unless perHead.
  decisions: [
    { id: "day1-hotel", title: "Where we sleep on night one", place: "phuket", kind: "stay",
      options: [
        { id: "horange", label: "Horange Phuket", costINR: 10300, unit: "night, 3 rooms", note: "6.5 km to pier.", url: "https://www.agoda.com/en-in/accom/property?propertyId=55611369" },
        { id: "pearl", label: "Pearl Hotel Phuket", costINR: 13000, unit: "night, 3 rooms", note: "6 km from pier.", url: "https://www.agoda.com/en-in/accom/property?propertyId=10919" },
        { id: "merlin", label: "Phuket Merlin Hotel", costINR: 14700, unit: "night, 3 rooms", note: "Pier side.", url: "https://www.agoda.com/en-in/accom/property?propertyId=48531" }
      ] },
    { id: "aonang-stay", title: "Ao Nang stay, two nights", place: "aonang", kind: "stay",
      options: [
        { id: "abnb4114674", label: "Ban Preeya Private Pool Villa (the Airbnb)", costINR: 38000, unit: "2 nights, 3 rooms, 3.5 bathrooms", note: "3 king en-suites, private pool, 4.92 from 64 reviews, Superhost. Na Thai, inland: a 5-minute drive to the beach and bars, so every outing is a Grab. Works out to about 6,330 INR per room-night, above the 5K cap.", url: "https://www.airbnb.co.in/rooms/4114674" },
        { id: "smoothsilk", label: "Smooth as Silk, 3-bedroom pool villa", costINR: 28600, unit: "2 nights, from about 170 USD a night", note: "3 king rooms, sleeps 6. From-price on Booking.com, not a quote for your dates. About 4,800 INR per room-night.", url: "https://www.booking.com/hotel/th/exclusive-private-pool-villa-smoth-as-silk.html" },
        { id: "nine", label: "Aonang Nine Poolvilla", costINR: 31800, unit: "2 nights, from about 189 USD a night", note: "3-bedroom villas near Ao Nang Beach, 6 guests. From-price, unverified for the dates.", url: "https://www.booking.com/hotel/th/the-nine-villa.html" },
        { id: "hotels", label: "Three hotel rooms on the strip", costINR: 0, unit: "price pending", note: "Anawin Bungalows (Ao Nang) or Doo Dee Boutique (Nopparat Thara, by the night market): walk to bars and the pier, no pool.", url: "https://www.indietraveller.co/where-to-stay-in-krabi/" }
      ] },
    { id: "day3", title: "Day 3: how we do Phi Phi", place: "phiphi", kind: "plan",
      options: [
        { id: "overnight", label: "Sleep one night on Phi Phi, ferry straight to Phuket on Friday", costINR: 62000, unit: "for five: boats, room, private longtail, park fee, ferry out, island food", note: "Research recommendation. Ferry 09:20 over, 14:00 to 18:00 private longtail to Pileh and Maya after the day boats leave, fire show at Slinky or Carlito's, 11:00 ferry to Phuket. Net about 11,000 to 25,000 INR more than the day trip once you drop the second Ao Nang night and the road transfer. Room under 1,780 THB in Tonsai back streets still to confirm." },
        { id: "daytrip", label: "Shared speedboat day trip, drop kayaking", costINR: 33400, unit: "for five: tour, park fee, drinks", note: "1,350 to 2,000 THB per head plus 400 park fee. Maya Bay at 10:30 with everyone else. Back in Ao Nang 15:30 to 17:00; kayaking after is not possible, sunset is 18:02." },
        { id: "earlybird", label: "Early-bird tour, 07:00 boat, Maya Bay almost empty", costINR: 38000, unit: "for five, plus park fee", note: "2,400 to 2,650 THB per head, 9 hours, Maya Bay at 07:45, then Pileh, Bamboo, Chicken Island. Keep Ao Nang as base." },
        { id: "hong", label: "Skip Phi Phi here: Hong Islands plus kayak, Phi Phi from Phuket later", costINR: 61000, unit: "for five, both days", note: "Only if kayaking is non-negotiable. Hong longtail plus kayak about 1,850 THB per head plus 300 park; Phuket Phi Phi tours 2,500 to 2,800 per head at the worst crowd slot." }
      ] },
    { id: "day2-plan", title: "Day 2 in Krabi: the research pick", place: "aonang", kind: "plan",
      options: [
        { id: "thalane", label: "Ao Thalane mangrove kayak, 13:00 pickup", costINR: 12600, unit: "for five, 800 to 1,000 THB per head", note: "Fits if you reach Ao Nang by 12:30. Back about 18:00, then Klong Haeng market (Wednesdays 16:00 to 21:00, 1.5 km away)." },
        { id: "fourisland", label: "4-island longtail tour", costINR: 20000, unit: "for five, about 1,000 to 1,500 THB walk-in plus park fee", note: "Poda, Chicken, Tup, Phra Nang. Needs a full day from 09:00, so only if you arrive the night before." },
        { id: "railay", label: "Railay afternoon: longtail over, Phra Nang beach, sunset, boat back", costINR: 2100, unit: "for five, 100 THB each way, 150 after 18:00", note: "Lowest effort. Shared boats wait for 8 people." }
      ] },
    { id: "phuket-area", title: "Phuket base for the four nights", place: "phuket", kind: "stay",
      options: [
        { id: "patong", label: "Patong", costINR: 0, unit: "", note: "Nightlife, Bangla Road, busiest beach. Price band pending." },
        { id: "kata", label: "Kata / Karon", costINR: 0, unit: "", note: "Calmer beaches, surf in season, short Grab to Patong. Price band pending." },
        { id: "oldtown", label: "Phuket Old Town", costINR: 0, unit: "", note: "Food, Sunday walking street, cheapest, no beach. Price band pending." },
        { id: "pier", label: "Pier side", costINR: 0, unit: "", note: "Only useful for a ferry morning." }
      ] }
  ],

  reddit: {
    phuket: { status: "pending", summary: [], sources: [], queries: [] },
    krabi:  { status: "blocked", summary: [
        "Blogs and forums (not Reddit) agree: Ao Nang is convenient and has the nightlife but is touristy; Railay is the scenery but pricey and flooded with day-trippers; Nopparat Thara is the quieter beach next door with the night market; Krabi Town is the cheapest food and no beach.",
        "Two days in Krabi is tight. The usual split is one island day (4-island or Hong) and one Railay plus Ao Nang day.",
        "Ao Thalane kayaking is protected mangrove channels and wants high tide; Bor Thor is the river option when the sea is choppy."
      ], sources: [
        { title: "Indie Traveller: where to stay in Krabi (2026-10-14)", url: "https://www.indietraveller.co/where-to-stay-in-krabi/" },
        { title: "TripAdvisor forum: Ao Thalane vs Bor Thor", url: "https://www.tripadvisor.com/ShowTopic-g297927-i9287-k5449173-Kayaking_hong_Is_ao_thalane_or_bor_thor-Krabi_Town_Krabi_Province.html" }
      ], queries: ["r/ThailandTourism: Ao Nang vs Railay", "r/ThailandTourism: Krabi 2 days", "r/Thailand: Krabi island tour 4 island hong", "r/IndiaTravel: Krabi Ao Nang"] },
    phiphi: { status: "blocked", summary: [
        "Day trip or overnight? Three of four 2026 guides say sleep at least one night; the dissent says day trips deliver most of the value unless you want early Maya Bay or the evening scene.",
        "Is Maya Bay worth it now? Split. It is a timed, no-swim photo stop. Pileh Lagoon and Bamboo Island are the parts people actually enjoy.",
        "Krabi or Phuket departure? Krabi: 45-minute crossing instead of 90, smaller boats, earlier at Maya Bay.",
        "Where to sleep: not on the Loh Dalum beachfront unless you are at the bar till close; back streets of Tonsai for cheap private rooms; Long Beach for quiet.",
        "Overrated? Tonsai is crowded and rooms are poor value; one night is enough for most."
      ], sources: [
        { title: "Visit Thailand Today: Koh Phi Phi guide (2026-08-30)", url: "https://www.visitthailandtoday.com/guides/koh-phi-phi-guide" },
        { title: "Global Gallivanting: is Phi Phi worth visiting (2026-09-11)", url: "https://www.global-gallivanting.com/koh-phi-phi-travel-guide-is-it-worth-visiting/" },
        { title: "Time Out Bangkok: Maya Bay reopens (2026-09-29)", url: "https://www.timeout.com/bangkok/news/thailand-famous-maya-bay-reopens-092926" }
      ], queries: ["r/ThailandTourism: Phi Phi day trip or stay one night", "r/ThailandTourism: Maya Bay worth it no swimming", "r/Thailand: Phi Phi overrated", "r/IndiaTravel: Krabi Phi Phi Phuket itinerary November"] }
  },

  // Do / Eat / Drink per place. costTHB is per head unless the note says otherwise.
  guide: {
    krabi: {
      do: [
        { name: "Ao Thalane mangrove kayak", costTHB: 900, note: "Half day, 13:00 pickup, calm channels and canyons. Best moved to Day 2." },
        { name: "Railay rock climbing, half-day course", costTHB: 1500, note: "Beginner top-rope with King Climbers, gear and longtail included. Price from resellers, about 40 to 46 USD." },
        { name: "Tiger Cave Temple, 1,260 steps", costTHB: 0, note: "Free or donation. Grab 200 to 300 each way. Go at opening or late afternoon." },
        { name: "Hong Islands lagoon", costTHB: 1400, note: "Longtail day tour plus 300 THB park fee. Gentler snorkelling than Phi Phi." },
        { name: "Railay West and Phra Nang cave beach", costTHB: 100, note: "Longtail each way, 150 after 18:00, boats wait for 8 people. Best sunset beach." },
        { name: "Emerald Pool and hot springs", costTHB: 600, note: "400 plus 200 entry, 1.5 h drive. Full day; probably one too many for two nights." }
      ],
      eat: [
        { name: "Maharaj morning market, Krabi Town", costTHB: 50, note: "Jok, dim sum, roti gaeng, khao yam. Go 06:00 to 09:00." },
        { name: "Abdulloh Muslim Restaurant, Krabi Town", costTHB: 60, note: "Beef soup, gaeng som, roti gaeng, milk tea. Krabi's Muslim-Thai core." },
        { name: "Klong Haeng market (Wed, Sun)", costTHB: 60, note: "Khao man gai, pad thai, khanom krok. 16:00 to 21:00, local prices." },
        { name: "Chao Fah pier night market, Krabi Town", costTHB: 150, note: "Grilled whole fish 250 to 400, skewers, tom yum. Daily 17:00 to 22:00." },
        { name: "Ruen Mai, Sai Thai", costTHB: 300, note: "Southern Thai in a garden house: gaeng tai pla, khao yam, massaman." },
        { name: "Krua Thara, Nopparat Thara", costTHB: 450, note: "Krabi's best-known live-tank seafood hall." },
        { name: "Kotung, Krabi Town", costTHB: 120, note: "Sino-Thai braised pork belly, crab curry. Has moved; check Maps." },
        { name: "Ali Baba, Ao Nang", costTHB: 250, note: "Halal Indian-Thai and seafood for a desi night. Govinda's for pure veg." },
        { name: "Ao Nang Landmark night market", costTHB: 250, note: "Convenient, seating, live music, two to three times local prices." }
      ],
      drink: [
        { name: "The Last Fisherman Bar", costTHB: 120, note: "Driftwood bar on the sand at the south end, sunset and BBQ, closes 22:00." },
        { name: "The Beach Bar", costTHB: 150, note: "Beach-facing chill-out for sunset." },
        { name: "Boogie Bar, Walking Street", costTHB: 250, note: "Cover band nightly till 01:30, the reliable loud night, pricey." },
        { name: "Centre Point complex", costTHB: 180, note: "Three floors of bars, live music at Smile Bar, touts outside." },
        { name: "Reggae Town", costTHB: 150, note: "Live roots and reggae on the Krabi road, the local music bar." },
        { name: "The Last Bar, Railay", costTHB: 200, note: "Fire shows and dancing. Needs a 150 THB night boat back." }
      ]
    },
    phiphi: {
      do: [
        { name: "Private longtail, 14:00 to 18:00", costTHB: 660, note: "2,000 to 3,300 per boat for five: Pileh, Viking Cave, Maya Bay late slot, snorkel Loh Samah. Plus 400 park fee each." },
        { name: "Sunrise longtail, 06:00 to 10:00", costTHB: 660, note: "The emptiest Maya Bay. Then the 11:00 or 14:00 ferry out." },
        { name: "Pileh Lagoon and Bamboo Island", costTHB: 0, note: "The two stops every guide says people actually enjoy." },
        { name: "Viewpoint 2 before 09:00", costTHB: 30, note: "The twin-bay photo. Heat and crowds after." },
        { name: "Long Beach swim", costTHB: 150, note: "Longtail taxi 100 to 200 per boat from Tonsai. Quiet side." },
        { name: "Kayak at Loh Dalum or Long Beach", costTHB: 200, note: "150 to 300 per hour if anyone still wants a paddle." }
      ],
      eat: [
        { name: "Tonsai village stalls", costTHB: 120, note: "Island premium on everything; budget about 700 THB a head for the night." },
        { name: "Paradise Pearl seafood BBQ, Long Beach", costTHB: 400, note: "If you sleep on the quiet side." }
      ],
      drink: [
        { name: "Slinky Beach Bar, Loh Dalum", costTHB: 350, note: "Still the best fire show, about 22:00. Buckets and bass till 02:00." },
        { name: "Carlito's, Tonsai bay", costTHB: 250, note: "Fire show about 21:30, live music, more toned down." },
        { name: "Ibiza Beach Club", costTHB: 300, note: "Beachfront dancefloor, fire performers from cushions." }
      ],
      stay: [
        { name: "White House Phi Phi Island", costTHB: 1250, note: "Tonsai, simple clean AC rooms, set back from the noise. Per room-night, blog figure." },
        { name: "P2 Wood Loft", costTHB: 1500, note: "Tonsai centre, modern, central means noise." },
        { name: "Paradise Pearl Bungalows, Long Beach", costTHB: 1800, note: "On the beach, quiet, a boat from the bars." }
      ]
    },
    phuket: { do: [], eat: [], drink: [] }
  },

  essentials: [
    { k: "Visa", v: "Indian passports: 30 days visa-free for tourism, no fee, since 15 Sep 2026. The old 60-day scheme is gone; older blogs are wrong.", src: "https://www.tatnews.org/2026/09/thailand-introduces-new-30-day-and-15-day-visa-exemption-rules-from-15-september/" },
    { k: "Arrival card", v: "Thailand Digital Arrival Card is mandatory and free. File it 14 to 16 Nov, within 72 hours of landing, one per person, official portal only.", src: "https://tdac.immigration.go.th/arrival-card/#/home" },
    { k: "Cash at immigration", v: "Embassy of India (2 Jul 2026) says carry 20,000 THB per person in cash plus return ticket, hotel bookings and itinerary; checks are happening at Phuket. It becomes spending money.", src: "https://embassyofindiabangkok.gov.in/public/assets/pdf/Bangkok_Adivisory_020726.pdf" },
    { k: "Money", v: "1 THB = 2.81 INR. Thai ATMs add 220 THB per withdrawal; always decline dynamic currency conversion. UPI in Thailand is not confirmed, assume no.", src: "research/essentials.md" },
    { k: "Phone", v: "Airalo 10 GB about 11 USD, or AIS tourist SIM at the airport about 1,199 THB for 30 days unlimited. Keep the Indian SIM on for OTPs with data off. Install Grab and Bolt before flying.", src: "research/essentials.md" },
    { k: "Weather", v: "Tail of the monsoon: about 12 to 16 rainy days in November, 31 by day, sea 29. Second half of the month is drier. Book boats for the morning and keep one flexible day. Sunset about 18:04.", src: "research/essentials.md" },
    { k: "Rules", v: "Vapes are illegal, leave them at home. Alcohol sold 11:00 to midnight. No dry day in your window. Loy Krathong falls on Tue 24 Nov, departure day. Reef-safe zinc sunscreen in marine parks.", src: "research/essentials.md" },
    { k: "Safety", v: "Tourist police 1155, ambulance 1669, Embassy of India +66 2 258 0300. Scooters need a motorcycle licence plus an international permit; rental insurance is third-party only. Jet-ski damage and passport-hostage scooter rentals are the classic scams.", src: "research/essentials.md" },
    { k: "Budget frame", v: "Excluding flights, with stays at your 3 to 5K caps: about 60,000 INR per head low to 1,04,000 mid; realistic target 75,000 to 85,000 each.", src: "research/essentials.md" }
  ],

  fx: { inrPerThb: 2.81, usdInr: 84, note: "1 THB = 2.81 INR (Wise mid-market, 2026-10-24). USD at ~84 INR, approx." }
};
