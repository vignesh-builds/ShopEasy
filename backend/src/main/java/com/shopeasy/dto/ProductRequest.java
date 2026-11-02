package com.shopeasy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

// Size limits match the database column lengths, so an over-long value gives a clear 400 error
// instead of a confusing database failure. Everything after "stock" is optional.
public record ProductRequest(@NotBlank @Size(max = 255) String name,
                             @NotBlank @Size(max = 1200) String description,
                             @NotBlank @Size(max = 255) String category,
                             @PositiveOrZero double price,
                             @NotBlank @Size(max = 255) String imageUrl,
                             @PositiveOrZero int stock,
                             @Size(max = 255) String brand,
                             @PositiveOrZero Double mrp,
                             @Size(max = 2000) String images,
                             @Size(max = 500) String colors,
                             @Size(max = 500) String sizes,
                             @Size(max = 2000) String highlights,
                             @Size(max = 2000) String specifications) {
}
