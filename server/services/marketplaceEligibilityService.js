const Business = require('../models/Business');

const PUBLIC_BUSINESS_FILTER = {
  status: 'active',
  isPublic: true
};

async function getPublicBusiness(businessId) {
  const business = await Business.findOne({
    _id: businessId,
    ...PUBLIC_BUSINESS_FILTER
  });

  if (!business) {
    throw new Error('Business not found or not public');
  }

  return business;
}

/**
 * Build the ownership predicate for a requested public business.
 * Direct businessId ownership always wins. Legacy userId-only products are
 * eligible only when the owner has exactly one active public business.
 */
async function getBusinessProductOwnershipQuery(business) {
  const ownership = [{ businessId: business._id }];

  if (business.userId) {
    const publicBusinessCount = await Business.countDocuments({
      userId: business.userId,
      ...PUBLIC_BUSINESS_FILTER
    });

    if (publicBusinessCount === 1) {
      ownership.push({
        userId: business.userId,
        $or: [
          { businessId: { $exists: false } },
          { businessId: null }
        ]
      });
    }
  }

  return ownership.length === 1 ? ownership[0] : { $or: ownership };
}

/**
 * Check whether a product may be read or purchased through a public
 * marketplace path. Explicit business ownership must point to an eligible
 * business; legacy user-only ownership is accepted only for one public store.
 */
async function getMarketplaceProductQuery() {
  const businesses = await Business.find(PUBLIC_BUSINESS_FILTER)
    .select('_id userId')
    .lean();

  const businessIds = businesses.map(business => business._id);
  const ownerCounts = new Map();
  for (const business of businesses) {
    if (!business.userId) continue;
    const key = String(business.userId);
    ownerCounts.set(key, (ownerCounts.get(key) || 0) + 1);
  }

  const unambiguousUserIds = businesses
    .filter(business => business.userId && ownerCounts.get(String(business.userId)) === 1)
    .map(business => business.userId);

  return {
    $and: [
      {
        $or: [
          { businessId: { $in: businessIds } },
          {
            userId: { $in: unambiguousUserIds },
            $or: [
              { businessId: { $exists: false } },
              { businessId: null }
            ]
          }
        ]
      },
      { isPublished: true, status: 'active' }
    ]
  };
}

async function isProductEligibleForBusiness(product, businessId) {
  if (!product) return false;
  const business = await getPublicBusiness(businessId);
  const ownership = await getBusinessProductOwnershipQuery(business);
  const Product = require('../models/Product');
  return Boolean(await Product.exists({
    $and: [
      { _id: product._id },
      ownership,
      { isPublished: true, status: 'active' }
    ]
  }));
}

async function isPublicMarketplaceProduct(product) {
  if (!product || product.status !== 'active' || product.isPublished !== true) {
    return false;
  }

  if (product.businessId) {
    return Boolean(await Business.exists({
      _id: product.businessId,
      ...PUBLIC_BUSINESS_FILTER
    }));
  }

  if (!product.userId) return false;

  const publicBusinessCount = await Business.countDocuments({
    userId: product.userId,
    ...PUBLIC_BUSINESS_FILTER
  });

  return publicBusinessCount === 1;
}

module.exports = {
  PUBLIC_BUSINESS_FILTER,
  getPublicBusiness,
  getBusinessProductOwnershipQuery,
  getMarketplaceProductQuery,
  isProductEligibleForBusiness,
  isPublicMarketplaceProduct
};
