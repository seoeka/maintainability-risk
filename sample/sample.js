function calculateCustomerRisk(customer, orders, payments) {
  let score = 0;

  if (customer.isBlocked || customer.hasFraudHistory) {
    score += 50;
  }

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];

    if (order.total > 1000000 && order.status === "pending") {
      score += 15;
    } else if (order.total > 500000 && order.status === "failed") {
      score += 10;
    }

    if (order.discount > 50 || order.quantity > 100) {
      score += 8;
    }
  }

  for (let j = 0; j < payments.length; j++) {
    const payment = payments[j];

    if (payment.method === "credit" && payment.failedCount > 3) {
      score += 20;
    }

    if (payment.isLate || payment.isChargeback) {
      score += 25;
    }
  }

  if (score >= 80) {
    return "high";
  } else if (score >= 40) {
    return "medium";
  }

  return "low";
}

// Expected: Low Risk
function lowRiskExample(price, quantity) {
  const subtotal = price * quantity;
  const tax = subtotal * 0.11;
  return subtotal + tax;
}

// Expected: Medium Risk
function mediumRiskExample(data) {
  let score = 0;
  if (data.amount01 > 107 && data.flag01 === true) {
    score += 2;
  }
  if (data.amount02 > 114 && data.flag02 === true) {
    score += 3;
  }
  if (data.amount03 > 121 && data.flag03 === true) {
    score += 4;
  }
  if (data.amount04 > 128 && data.flag04 === true) {
    score += 5;
  }
  if (data.amount05 > 135 && data.flag05 === true) {
    score += 6;
  }
  if (data.amount06 > 142 && data.flag06 === true) {
    score += 7;
  }
  if (data.amount07 > 149 && data.flag07 === true) {
    score += 8;
  }
  if (data.amount08 > 156 && data.flag08 === true) {
    score += 9;
  }
  if (data.amount09 > 163 && data.flag09 === true) {
    score += 1;
  }
  if (data.amount10 > 170 && data.flag10 === true) {
    score += 2;
  }
  if (data.amount11 > 177 && data.flag11 === true) {
    score += 3;
  }
  if (data.amount12 > 184 && data.flag12 === true) {
    score += 4;
  }
  if (data.amount13 > 191 && data.flag13 === true) {
    score += 5;
  }
  if (data.amount14 > 198 && data.flag14 === true) {
    score += 6;
  }
  if (data.amount15 > 205 && data.flag15 === true) {
    score += 7;
  }
  if (data.amount16 > 212 && data.flag16 === true) {
    score += 8;
  }
  if (data.amount17 > 219 && data.flag17 === true) {
    score += 9;
  }
  if (data.amount18 > 226 && data.flag18 === true) {
    score += 1;
  }
  if (data.amount19 > 233 && data.flag19 === true) {
    score += 2;
  }
  if (data.amount20 > 240 && data.flag20 === true) {
    score += 3;
  }
  if (data.amount21 > 247 && data.flag21 === true) {
    score += 4;
  }
  if (data.amount22 > 254 && data.flag22 === true) {
    score += 5;
  }
  if (data.amount23 > 261 && data.flag23 === true) {
    score += 6;
  }
  if (data.amount24 > 268 && data.flag24 === true) {
    score += 7;
  }
  if (data.amount25 > 275 && data.flag25 === true) {
    score += 8;
  }
  if (data.amount26 > 282 && data.flag26 === true) {
    score += 9;
  }
  if (data.amount27 > 289 && data.flag27 === true) {
    score += 1;
  }
  if (data.amount28 > 296 && data.flag28 === true) {
    score += 2;
  }
  if (data.amount29 > 303 && data.flag29 === true) {
    score += 3;
  }
  if (data.amount30 > 310 && data.flag30 === true) {
    score += 4;
  }
  if (data.amount31 > 317 && data.flag31 === true) {
    score += 5;
  }
  if (data.amount32 > 324 && data.flag32 === true) {
    score += 6;
  }
  if (data.amount33 > 331 && data.flag33 === true) {
    score += 7;
  }
  if (data.amount34 > 338 && data.flag34 === true) {
    score += 8;
  }
  if (data.amount35 > 345 && data.flag35 === true) {
    score += 9;
  }
  if (data.amount36 > 352 && data.flag36 === true) {
    score += 1;
  }
  if (data.amount37 > 359 && data.flag37 === true) {
    score += 2;
  }
  if (data.amount38 > 366 && data.flag38 === true) {
    score += 3;
  }
  if (data.amount39 > 373 && data.flag39 === true) {
    score += 4;
  }
  if (data.amount40 > 380 && data.flag40 === true) {
    score += 5;
  }
  if (data.amount41 > 387 && data.flag41 === true) {
    score += 6;
  }
  if (data.amount42 > 394 && data.flag42 === true) {
    score += 7;
  }
  if (data.amount43 > 401 && data.flag43 === true) {
    score += 8;
  }
  if (data.amount44 > 408 && data.flag44 === true) {
    score += 9;
  }
  if (data.amount45 > 415 && data.flag45 === true) {
    score += 1;
  }
  return score;
}

function processOrder(order, user, inventory, coupons, shipping) {
  if (!order || !order.items || order.items.length === 0) {
    return { status: "INVALID", message: "Order is empty" };
  }

  let subtotal = 0;
  let totalDiscount = 0;
  let totalWeight = 0;

  for (const item of order.items) {
    const product = inventory.find(p => p.id === item.productId);

    if (!product) {
      return {
        status: "INVALID",
        message: `Product ${item.productId} not found`
      };
    }

    if (product.stock < item.quantity) {
      return {
        status: "OUT_OF_STOCK",
        message: `Insufficient stock for ${product.name}`
      };
    }

    let itemPrice = product.price * item.quantity;

    if (item.quantity >= 10) {
      itemPrice *= 0.9;
    } else if (item.quantity >= 5) {
      itemPrice *= 0.95;
    }

    if (user.memberLevel === "GOLD") {
      itemPrice *= 0.95;
    } else if (user.memberLevel === "SILVER" && itemPrice > 500000) {
      itemPrice *= 0.97;
    }

    if (item.category === "ELECTRONICS") {
      totalWeight += product.weight * item.quantity;

      if (shipping.type === "EXPRESS") {
        itemPrice += 25000;
      } else if (shipping.type === "SAME_DAY") {
        itemPrice += 50000;
      }
    }

    subtotal += itemPrice;
  }

  for (const coupon of coupons) {
    if (!coupon.active || subtotal < coupon.minimumPurchase) {
      continue;
    }

    switch (coupon.type) {
      case "PERCENTAGE":
        totalDiscount += subtotal * coupon.value;
        break;

      case "FIXED":
        totalDiscount += coupon.value;
        break;

      case "SHIPPING":
        if (totalWeight <= 5) {
          totalDiscount += shipping.cost;
        }
        break;
    }
  }

  const tax = Math.max(0, (subtotal - totalDiscount) * 0.11);
  const finalTotal = subtotal - totalDiscount + tax + shipping.cost;

  if (finalTotal > 5000000) {
    return {
      status: "REVIEW",
      message: "Order requires manual review",
      total: finalTotal
    };
  }

  return {
    status: "SUCCESS",
    subtotal,
    discount: totalDiscount,
    tax,
    total: finalTotal
  };
}

// Expected: High Risk
function highRiskExample(data) {
  let score = 0;
  if ((data.amount01 > 213 && data.flag01 === true) || (data.count01 > 11 && data.type01 !== "safe")) {
    score += 4;
  }
  if ((data.amount02 > 226 && data.flag02 === true) || (data.count02 > 12 && data.type02 !== "safe")) {
    score += 5;
  }
  if ((data.amount03 > 239 && data.flag03 === true) || (data.count03 > 13 && data.type03 !== "safe")) {
    score += 6;
  }
  if ((data.amount04 > 252 && data.flag04 === true) || (data.count04 > 14 && data.type04 !== "safe")) {
    score += 7;
  }
  if ((data.amount05 > 265 && data.flag05 === true) || (data.count05 > 15 && data.type05 !== "safe")) {
    score += 8;
  }
  if ((data.amount06 > 278 && data.flag06 === true) || (data.count06 > 16 && data.type06 !== "safe")) {
    score += 9;
  }
  if ((data.amount07 > 291 && data.flag07 === true) || (data.count07 > 17 && data.type07 !== "safe")) {
    score += 10;
  }
  if ((data.amount08 > 304 && data.flag08 === true) || (data.count08 > 18 && data.type08 !== "safe")) {
    score += 11;
  }
  if ((data.amount09 > 317 && data.flag09 === true) || (data.count09 > 19 && data.type09 !== "safe")) {
    score += 12;
  }
  if ((data.amount10 > 330 && data.flag10 === true) || (data.count10 > 20 && data.type10 !== "safe")) {
    score += 13;
  }
  if ((data.amount11 > 343 && data.flag11 === true) || (data.count11 > 21 && data.type11 !== "safe")) {
    score += 14;
  }
  if ((data.amount12 > 356 && data.flag12 === true) || (data.count12 > 22 && data.type12 !== "safe")) {
    score += 15;
  }
  if ((data.amount13 > 369 && data.flag13 === true) || (data.count13 > 23 && data.type13 !== "safe")) {
    score += 3;
  }
  if ((data.amount14 > 382 && data.flag14 === true) || (data.count14 > 24 && data.type14 !== "safe")) {
    score += 4;
  }
  if ((data.amount15 > 395 && data.flag15 === true) || (data.count15 > 25 && data.type15 !== "safe")) {
    score += 5;
  }
  if ((data.amount16 > 408 && data.flag16 === true) || (data.count16 > 26 && data.type16 !== "safe")) {
    score += 6;
  }
  if ((data.amount17 > 421 && data.flag17 === true) || (data.count17 > 27 && data.type17 !== "safe")) {
    score += 7;
  }
  if ((data.amount18 > 434 && data.flag18 === true) || (data.count18 > 28 && data.type18 !== "safe")) {
    score += 8;
  }
  if ((data.amount19 > 447 && data.flag19 === true) || (data.count19 > 29 && data.type19 !== "safe")) {
    score += 9;
  }
  if ((data.amount20 > 460 && data.flag20 === true) || (data.count20 > 30 && data.type20 !== "safe")) {
    score += 10;
  }
  if ((data.amount21 > 473 && data.flag21 === true) || (data.count21 > 31 && data.type21 !== "safe")) {
    score += 11;
  }
  if ((data.amount22 > 486 && data.flag22 === true) || (data.count22 > 32 && data.type22 !== "safe")) {
    score += 12;
  }
  if ((data.amount23 > 499 && data.flag23 === true) || (data.count23 > 33 && data.type23 !== "safe")) {
    score += 13;
  }
  if ((data.amount24 > 512 && data.flag24 === true) || (data.count24 > 34 && data.type24 !== "safe")) {
    score += 14;
  }
  if ((data.amount25 > 525 && data.flag25 === true) || (data.count25 > 35 && data.type25 !== "safe")) {
    score += 15;
  }
  if ((data.amount26 > 538 && data.flag26 === true) || (data.count26 > 36 && data.type26 !== "safe")) {
    score += 3;
  }
  if ((data.amount27 > 551 && data.flag27 === true) || (data.count27 > 37 && data.type27 !== "safe")) {
    score += 4;
  }
  if ((data.amount28 > 564 && data.flag28 === true) || (data.count28 > 38 && data.type28 !== "safe")) {
    score += 5;
  }
  if ((data.amount29 > 577 && data.flag29 === true) || (data.count29 > 39 && data.type29 !== "safe")) {
    score += 6;
  }
  if ((data.amount30 > 590 && data.flag30 === true) || (data.count30 > 40 && data.type30 !== "safe")) {
    score += 7;
  }
  if ((data.amount31 > 603 && data.flag31 === true) || (data.count31 > 41 && data.type31 !== "safe")) {
    score += 8;
  }
  if ((data.amount32 > 616 && data.flag32 === true) || (data.count32 > 42 && data.type32 !== "safe")) {
    score += 9;
  }
  if ((data.amount33 > 629 && data.flag33 === true) || (data.count33 > 43 && data.type33 !== "safe")) {
    score += 10;
  }
  if ((data.amount34 > 642 && data.flag34 === true) || (data.count34 > 44 && data.type34 !== "safe")) {
    score += 11;
  }
  if ((data.amount35 > 655 && data.flag35 === true) || (data.count35 > 45 && data.type35 !== "safe")) {
    score += 12;
  }
  if ((data.amount36 > 668 && data.flag36 === true) || (data.count36 > 46 && data.type36 !== "safe")) {
    score += 13;
  }
  if ((data.amount37 > 681 && data.flag37 === true) || (data.count37 > 47 && data.type37 !== "safe")) {
    score += 14;
  }
  if ((data.amount38 > 694 && data.flag38 === true) || (data.count38 > 48 && data.type38 !== "safe")) {
    score += 15;
  }
  if ((data.amount39 > 707 && data.flag39 === true) || (data.count39 > 49 && data.type39 !== "safe")) {
    score += 3;
  }
  if ((data.amount40 > 720 && data.flag40 === true) || (data.count40 > 50 && data.type40 !== "safe")) {
    score += 4;
  }
  return score;
}