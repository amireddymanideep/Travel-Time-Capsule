package com.traveltimecapsule.capsule;

import com.traveltimecapsule.user.UserAccount;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "capsules")
public class Capsule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount owner;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 150)
    private String destination;

    @Column(length = 300)
    private String location;

    @Column(length = 100)
    private String coordinates;

    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;

    @Column(name = "unlock_date", nullable = false)
    private LocalDate unlockDate;

    @Column(length = 500)
    private String companions;

    @Column(precision = 12, scale = 2)
    private BigDecimal expenses;

    @Column(columnDefinition = "text")
    private String description;

    @Column(columnDefinition = "text")
    private String note;

    @Column(name = "video_url", length = 2048)
    private String videoUrl;

    @ElementCollection
    @CollectionTable(name = "capsule_photos", joinColumns = @JoinColumn(name = "capsule_id"))
    @Column(name = "photo_url", nullable = false, columnDefinition = "text")
    @OrderColumn(name = "photo_order")
    private List<String> photos = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected Capsule() {
    }

    public Capsule(UserAccount owner, CapsuleRequest request) {
        this.owner = owner;
        this.title = request.title().trim();
        this.destination = request.destination().trim();
        this.location = request.location();
        this.coordinates = request.coordinates();
        this.travelDate = request.travelDate();
        this.unlockDate = request.unlockDate();
        this.companions = request.companions();
        this.expenses = request.expenses();
        this.description = request.description();
        this.note = request.note();
        this.videoUrl = request.videoUrl();
        this.photos = request.photoUrls() == null ? new ArrayList<>() : new ArrayList<>(request.photoUrls());
    }

    public Long getId() { return id; }
    public UserAccount getOwner() { return owner; }
    public String getTitle() { return title; }
    public String getDestination() { return destination; }
    public String getLocation() { return location; }
    public String getCoordinates() { return coordinates; }
    public LocalDate getTravelDate() { return travelDate; }
    public LocalDate getUnlockDate() { return unlockDate; }
    public String getCompanions() { return companions; }
    public BigDecimal getExpenses() { return expenses; }
    public String getDescription() { return description; }
    public String getNote() { return note; }
    public String getVideoUrl() { return videoUrl; }
    public List<String> getPhotos() { return photos; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
