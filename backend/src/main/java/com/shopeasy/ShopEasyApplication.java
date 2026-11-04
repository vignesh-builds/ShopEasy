package com.shopeasy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class ShopEasyApplication {
    public static void main(String[] args) {
        SpringApplication.run(ShopEasyApplication.class, args);
    }
}
