# StegoPay-Backend

Steganography is a technique of hiding secret data such as text, images, videos, or files within an image, video, text, or file. StegoPay is a unique payment gateway that uses a unique mapping based coverless image steganography method to further secure digital payments.

The coverless image steganography technique that we developed is based on the concept of mapping. This technique provides freedom to the user to select any cover image to map their card details with.

The project consists of an Android wallet application and a full-stack web application. The Android application will allow users to choose an image to map their card details with (the card number, expiration date, and CVV), which will result in what is called a ‘stego-card’. (Android Application Repo: StegoPay-Android), The web application will further allow the user to make payments online, the user will be redirected to the StegoPay front end once they checkout from an online store, the user can then enter their credentials, choose a stego-card to pay with and make the payment (Front End Repo: StegoPay-FrontEnd), Both the web client and the android application will request services from the StegoPay Backend.
