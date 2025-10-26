// Rating Modal Functionality - UDEMY STYLE
let currentRating = 0;

// Star rating interaction - ĐÃ SỬA LOGIC
document.querySelectorAll('.star-rating-modal input').forEach((star, index) => {
    star.addEventListener('change', function () {
        currentRating = parseInt(this.value);
        document.getElementById('finalRating').value = currentRating;
        document.getElementById('chosenStars').textContent = currentRating;

        // Enable Next button
        document.getElementById('nextToStep2').disabled = false;

        // Update visual stars - ĐÃ SỬA LOGIC
        updateStarColors(currentRating);
    });
});

// Update star colors based on rating - ĐÃ SỬA LOGIC
function updateStarColors(rating) {
    document.querySelectorAll('.star-rating-modal label').forEach((label, index) => {
        const starValue = index + 1; // 1,2,3,4,5 (từ trái sang phải)
        label.style.color = starValue <= rating ? '#f4c150' : '#ddd';
        label.style.transform = starValue <= rating ? 'scale(1.1)' : 'scale(1)';
    });
}

// Character count for textarea
document.querySelector('#reviewForm textarea')?.addEventListener('input', function () {
    const count = this.value.length;
    document.getElementById('charCount').textContent = count;
});

// Modal step navigation
function showStep(stepNumber) {
    document.querySelectorAll('.modal-step').forEach(step => {
        step.style.display = 'none';
    });

    if (stepNumber === 1) {
        document.getElementById('ratingStep1').style.display = 'block';
    } else if (stepNumber === 2) {
        document.getElementById('ratingStep2').style.display = 'block';

        // Update chosen stars display
        document.getElementById('chosenStars').textContent = currentRating;
    }
}

// Next button click handler
document.getElementById('nextToStep2')?.addEventListener('click', function () {
    if (currentRating > 0) {
        showStep(2);
    }
});

// Submit review
async function submitReview() {
    const form = document.getElementById('reviewForm');
    const formData = new FormData(form);

    const data = {
        course_id: formData.get('course_id'),
        rating: formData.get('rating'),
        comment: formData.get('comment')
    };

    // Validation
    if (!data.rating || !data.comment.trim()) {
        alert('Please provide both a rating and a comment');
        return;
    }

    try {
        const response = await fetch('/student/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            // HIỆN THÔNG BÁO THÀNH CÔNG
            alert('Đánh giá của bạn đã được gửi thành công!');
            
            // Đóng modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('ratingModal'));
            modal.hide();
            
            // Reload trang sau 0.5 giây
            setTimeout(() => {
                location.reload();
            }, 500);
            
        } else {
            alert(' Lỗi: ' + result.message);
        }
    } catch (error) {
        console.error('Review submission error:', error);
        alert('An error occurred while submitting your review');
    }
}

// Hover effect for stars - THÊM MỚI
document.querySelectorAll('.star-rating-modal label').forEach((label, index) => {
    label.addEventListener('mouseenter', function () {
        const hoverRating = index + 1;
        updateStarColors(hoverRating);
    });

    label.addEventListener('mouseleave', function () {
        updateStarColors(currentRating);
    });
});

// Reset modal when closed
document.getElementById('ratingModal')?.addEventListener('hidden.bs.modal', function () {
    showStep(1);
    currentRating = 0;
    document.getElementById('nextToStep2').disabled = true;
    updateStarColors(0);
    document.getElementById('reviewForm').reset();
    document.getElementById('charCount').textContent = '0';
});