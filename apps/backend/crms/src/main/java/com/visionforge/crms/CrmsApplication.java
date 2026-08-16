package com.visionforge.crms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CrmsApplication {

	public static void main(String[] args) {
		SpringApplication.run(CrmsApplication.class, args);
	}

}
