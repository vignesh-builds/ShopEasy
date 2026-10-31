package com.shopeasy.dto;

import java.util.List;

/**
 * Product-page suggestions.
 * alsoBought = products other customers ordered together with this one (empty until there are orders).
 * similar    = same category / brand / price range first, then top-rated products from other categories,
 *              so this list is never empty as long as the shop has more than one product.
 */
public record RecommendationsResponse(List<ProductResponse> alsoBought, List<ProductResponse> similar) {
}
