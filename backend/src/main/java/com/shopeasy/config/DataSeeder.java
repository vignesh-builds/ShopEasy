package com.shopeasy.config;

import com.shopeasy.entity.Product;
import com.shopeasy.repository.ProductRepository;
import com.shopeasy.repository.ReviewRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

@Configuration
public class DataSeeder {

    /** Same photo, different focal point + zoom => extra "detail" shots for the gallery. */
    private static String gallery(String photoId) {
        String base = "https://images.unsplash.com/" + photoId + "?auto=format&fit=crop&w=900&h=900&q=80";
        return String.join("|",
                base + "&crop=focalpoint&fp-x=.3&fp-y=.4&fp-z=1.8",
                base + "&crop=focalpoint&fp-x=.7&fp-y=.6&fp-z=1.8",
                base + "&crop=focalpoint&fp-x=.5&fp-y=.5&fp-z=2.6");
    }

    private static Product product(String name, String desc, String category, double price, double mrp, String photoId,
                                   int stock, String brand,
                                   String colors, String sizes, String highlights, String specs) {
        Product p = new Product(name, desc, category, price,
                "https://images.unsplash.com/" + photoId + "?auto=format&fit=crop&w=900&q=80", stock);
        fill(p, mrp, photoId, brand, colors, sizes, highlights, specs);
        return p;
    }

    private static void fill(Product p, double mrp, String photoId, String brand,
                             String colors, String sizes, String highlights, String specs) {
        p.setBrand(brand); p.setMrp(mrp);              // rating / ratingCount come from real customer reviews
        p.setImages(gallery(photoId)); p.setColors(colors); p.setSizes(sizes);
        p.setHighlights(highlights); p.setSpecifications(specs);
    }

    /**
     * Old databases may have NOT NULL on the rating columns (earlier versions always stored a rating).
     * Reviews now leave them empty until someone reviews, so relax the constraint. Safe to run every start.
     */
    @Bean
    @Order(1)
    CommandLineRunner relaxOldColumns(JdbcTemplate jdbc) {
        return args -> {
            for (String column : List.of("rating", "rating_count")) {
                try {
                    jdbc.execute("ALTER TABLE products ALTER COLUMN " + column + " DROP NOT NULL");
                } catch (Exception ignored) {
                    // column missing / already nullable / database does not need it
                }
            }
        };
    }

    @Bean
    @Order(2)
    CommandLineRunner seedProducts(ProductRepository repository, ReviewRepository reviewRepository) {
        return args -> {
          try {
            if (repository.count() == 0) {
                repository.save(product("Everyday Sneakers", "Comfortable everyday sneakers with a clean modern look.", "Fashion", 1499, 2999, "photo-1542291026-7eec264c27ff", 25,
                        "StrideX", "White:#f5f5f5|Black:#1b1b1b|Olive:#6b7a4f", "6|7|8|9|10|11",
                        "Cushioned insole for all-day comfort|Breathable mesh upper|Durable anti-skid rubber outsole|Lightweight - easy to wear daily",
                        "Material:Mesh + Synthetic|Sole:Rubber|Closure:Lace-up|Fit:True to size|Occasion:Casual|Care:Wipe with a damp cloth"));
                repository.save(product("Wireless Headphones", "Over-ear wireless headphones for music and calls.", "Electronics", 2499, 4999, "photo-1505740420928-5e560c06d30e", 18,
                        "SoundNest", "Black:#1b1b1b|Silver:#c9cbd0|Blue:#2f4f8f", null,
                        "Up to 30 hours of playback|Bluetooth 5.3 with fast pairing|Soft memory-foam ear cushions|Built-in mic for clear calls",
                        "Connectivity:Bluetooth 5.3|Battery:30 hours|Charging:USB-C, 10 min = 5 hrs|Driver Size:40 mm|Weight:250 g|Warranty:1 year"));
                repository.save(product("Classic Backpack", "Roomy daily backpack for college, work and travel.", "Accessories", 1199, 1999, "photo-1553062407-98eeb64c6a62", 30,
                        "UrbanPack", "Grey:#7b7f86|Navy:#1f2a44|Tan:#b08a5b", null,
                        "30 L capacity - fits a 15.6 inch laptop|Water-resistant fabric|Padded shoulder straps|Multiple organiser pockets",
                        "Capacity:30 L|Material:Polyester|Laptop Fit:Up to 15.6 inch|Compartments:3|Weight:700 g|Warranty:6 months"));
                repository.save(product("Smart Watch", "Minimal smart watch with activity and notification features.", "Electronics", 3299, 5999, "photo-1523275335684-37898b6baf30", 12,
                        "TimeWave", "Black:#1b1b1b|Rose Gold:#c9a09a|Silver:#c9cbd0", null,
                        "1.4 inch AMOLED always-on display|Heart rate + SpO2 tracking|7 day battery life|IP68 water resistant",
                        "Display:1.4 inch AMOLED|Battery:7 days|Water Resistance:IP68|Sensors:HR, SpO2, Accelerometer|Compatibility:Android & iOS|Warranty:1 year"));
                repository.save(product("Ceramic Coffee Mug", "A simple ceramic mug for your everyday coffee ritual.", "Home", 399, 699, "photo-1514228742587-6b1558fcca3d", 40,
                        "HomeBrew", "White:#fafafa|Charcoal:#3a3d40|Terracotta:#c56b4a", null,
                        "350 ml capacity|Dishwasher and microwave safe|Smooth glaze, comfortable handle",
                        "Capacity:350 ml|Material:Ceramic|Dishwasher Safe:Yes|Microwave Safe:Yes|Weight:340 g"));
                repository.save(product("Sunglasses", "Classic UV-style sunglasses with a versatile frame.", "Fashion", 799, 1599, "photo-1511499767150-a48a237f0083", 20,
                        "ShadeCo", "Black:#1b1b1b|Tortoise:#7a4b2a|Gold:#c8a24a", "Small|Medium|Large",
                        "100% UV400 protection|Lightweight durable frame|Scratch-resistant lenses|Includes protective case",
                        "Lens:Polarised UV400|Frame:Polycarbonate|Fit:Unisex|Includes:Case + cleaning cloth"));
            } else {
                clearSampleRatings(repository, reviewRepository);
                backfillExisting(repository);
            }
          } catch (RuntimeException e) {
            // Never stop the whole server because of sample-data housekeeping; show the reason instead.
            System.err.println("ShopEasy: product seeding skipped - " + e.getMessage());
          }
        };
    }

    /** Earlier versions stored made-up sample ratings; keep a rating only when real reviews back it. */
    private void clearSampleRatings(ProductRepository repository, ReviewRepository reviewRepository) {
        for (Product p : repository.findAll()) {
            if ((p.getRating() != null || p.getRatingCount() != null) && reviewRepository.countByProductId(p.getId()) == 0) {
                p.setRating(null);
                p.setRatingCount(null);
                repository.save(p);
            }
        }
    }

    /** Databases created before the detail page existed: give the 6 sample products their new details once. */
    private void backfillExisting(ProductRepository repository) {
        List<Product> existing = repository.findAll();
        List<Product> samples = List.of(
                product("Everyday Sneakers", "", "", 0, 2999, "photo-1542291026-7eec264c27ff", 0, "StrideX",
                        "White:#f5f5f5|Black:#1b1b1b|Olive:#6b7a4f", "6|7|8|9|10|11",
                        "Cushioned insole for all-day comfort|Breathable mesh upper|Durable anti-skid rubber outsole|Lightweight - easy to wear daily",
                        "Material:Mesh + Synthetic|Sole:Rubber|Closure:Lace-up|Fit:True to size|Occasion:Casual|Care:Wipe with a damp cloth"),
                product("Wireless Headphones", "", "", 0, 4999, "photo-1505740420928-5e560c06d30e", 0, "SoundNest",
                        "Black:#1b1b1b|Silver:#c9cbd0|Blue:#2f4f8f", null,
                        "Up to 30 hours of playback|Bluetooth 5.3 with fast pairing|Soft memory-foam ear cushions|Built-in mic for clear calls",
                        "Connectivity:Bluetooth 5.3|Battery:30 hours|Charging:USB-C, 10 min = 5 hrs|Driver Size:40 mm|Weight:250 g|Warranty:1 year"),
                product("Classic Backpack", "", "", 0, 1999, "photo-1553062407-98eeb64c6a62", 0, "UrbanPack",
                        "Grey:#7b7f86|Navy:#1f2a44|Tan:#b08a5b", null,
                        "30 L capacity - fits a 15.6 inch laptop|Water-resistant fabric|Padded shoulder straps|Multiple organiser pockets",
                        "Capacity:30 L|Material:Polyester|Laptop Fit:Up to 15.6 inch|Compartments:3|Weight:700 g|Warranty:6 months"),
                product("Smart Watch", "", "", 0, 5999, "photo-1523275335684-37898b6baf30", 0, "TimeWave",
                        "Black:#1b1b1b|Rose Gold:#c9a09a|Silver:#c9cbd0", null,
                        "1.4 inch AMOLED always-on display|Heart rate + SpO2 tracking|7 day battery life|IP68 water resistant",
                        "Display:1.4 inch AMOLED|Battery:7 days|Water Resistance:IP68|Sensors:HR, SpO2, Accelerometer|Compatibility:Android & iOS|Warranty:1 year"),
                product("Ceramic Coffee Mug", "", "", 0, 699, "photo-1514228742587-6b1558fcca3d", 0, "HomeBrew",
                        "White:#fafafa|Charcoal:#3a3d40|Terracotta:#c56b4a", null,
                        "350 ml capacity|Dishwasher and microwave safe|Smooth glaze, comfortable handle",
                        "Capacity:350 ml|Material:Ceramic|Dishwasher Safe:Yes|Microwave Safe:Yes|Weight:340 g"),
                product("Sunglasses", "", "", 0, 1599, "photo-1511499767150-a48a237f0083", 0, "ShadeCo",
                        "Black:#1b1b1b|Tortoise:#7a4b2a|Gold:#c8a24a", "Small|Medium|Large",
                        "100% UV400 protection|Lightweight durable frame|Scratch-resistant lenses|Includes protective case",
                        "Lens:Polarised UV400|Frame:Polycarbonate|Fit:Unisex|Includes:Case + cleaning cloth"));
        for (Product p : existing) {
            if (p.getBrand() != null || p.getImages() != null) continue;      // already has details (or admin-edited)
            samples.stream().filter(s -> s.getName().equalsIgnoreCase(p.getName())).findFirst().ifPresent(s -> {
                p.setBrand(s.getBrand()); p.setMrp(s.getMrp()); p.setImages(s.getImages()); p.setColors(s.getColors());
                p.setSizes(s.getSizes()); p.setHighlights(s.getHighlights()); p.setSpecifications(s.getSpecifications());
                repository.save(p);
            });
        }
    }
}
