package com.shopeasy.dto;

import com.shopeasy.entity.Product;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record ProductResponse(Long id, String name, String description, String category,
                              double price, String imageUrl, int stock,
                              String brand, Double mrp, Double rating, Integer ratingCount,
                              List<String> images, List<Color> colors, List<String> sizes,
                              List<String> highlights, Map<String, String> specifications) {

    public record Color(String name, String hex) { }

    public static ProductResponse from(Product p) {
        return new ProductResponse(p.getId(), p.getName(), p.getDescription(), p.getCategory(),
                p.getPrice(), p.getImageUrl(), p.getStock(),
                p.getBrand(), p.getMrp(), p.getRating(), p.getRatingCount(),
                split(p.getImages()), colors(p.getColors()), split(p.getSizes()),
                split(p.getHighlights()), specs(p.getSpecifications()));
    }

    private static List<String> split(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.stream(value.split("\\|")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    private static List<Color> colors(String value) {
        return split(value).stream().map(s -> {
            int i = s.lastIndexOf(':');
            return i < 0 ? new Color(s, "#cccccc") : new Color(s.substring(0, i).trim(), s.substring(i + 1).trim());
        }).toList();
    }

    private static Map<String, String> specs(String value) {
        Map<String, String> map = new LinkedHashMap<>();
        for (String s : split(value)) {
            int i = s.indexOf(':');
            if (i > 0) map.put(s.substring(0, i).trim(), s.substring(i + 1).trim());
        }
        return map;
    }
}
