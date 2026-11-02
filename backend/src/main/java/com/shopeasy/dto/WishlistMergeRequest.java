package com.shopeasy.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Product ids a shopper saved as a guest, sent once right after they log in. */
public record WishlistMergeRequest(@NotNull @Size(max = 200) List<Long> productIds) {
}
