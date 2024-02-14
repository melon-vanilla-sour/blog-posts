---
title: Reducing Input Delay for the Keychron V1
category: software
tags:
  - software
  - qmk
  - keyboard
  - keychron
created: 2024-01-08
---

So I recently bought the Keychron v1 and noticed that [Rtings lists it as having 20ms of input delay](https://www.rtings.com/keyboard/reviews/keychron/v-series). For reference some 'gaming' keyboards advertise having a 1ms input delay and a good value seems to be less than 10ms. It's not that noticeable during normal use but it definitely feels a bit sluggish when playing games like Street Fighter where the responsiveness of keys matters. Luckily I was able to reduce the input delay to a point where it doesn't bother me at all, here's how. The general gist is that the Keychron v1 runs with a software known as QMK, an opensource firmware that controls microcontrollers on keyboards. With some research I was able to find a pull request that modifies the code to reduce input delay and after that I simply compiled the new firmware locally and used it to flash the keyboard. The instructions below will be tailored for Windows though the technique itself should be possible on Mac and Linux.

## The Science

The entire modification pretty much hinges on [this article by Michael Stapelberg](https://michael.stapelberg.ch/posts/2021-05-08-keyboard-input-latency-qmk-kinesis/#eagerdebounce) which concludes input lag can be reduced by a faster debouncing algorithm and a lower USB polling interval. [This is the example pull request](https://github.com/qmk/qmk_firmware/pull/12625/files) stated in the article which will be replicated in the V1. It seems the defaults were chosen as conservative values but having used the modified firmware to write this post, I can safely say that the tweaked code works fine on the V1 without any erroneous input.

## Modifying QMK Code

I followed the [official documentation](https://docs.qmk.fm/#/newbs_getting_started) to edit, compile and flash the firmware. First I downloaded and installed the [latest QMK_MSYS](https://github.com/qmk/qmk_distro_msys/releases/tag/1.8.0) which seems to be an easy executable that prepares the CLI environment. I then forked the [qmk repository](https://github.com/qmk/qmk_firmware) to my own github account and then cloned it to my local machine.

```bash
$ git clone --recurse-submodules https://github.com/<my_username>/qmk_firmware.git
```

Then I executed the setup command, specifying the home qmk folder

```bash
$ qmk setup -H qmk_firmware/
```

Then I navigated to `/keyboards/keychron/v1/ansi`, made a new branch and edited `config.h` and `rules.mk` according to the example pull request in the article.

```cpp
// config.h
#define USB_POLLING_INTERVAL_MS 1
```

```makefile
// rules.mk
DEBOUNCE_TYPE = sym_eager_pk
```

Finally I ran the compile command which builds the customized firmware as a `.bin` file in the root directory

```bash
$ qmk compile -kb keychron/v1/ansi -km default
```

## Flashing the Keyboard

Now all I had to do was install the new firmware into the keyboard. First I installed QMK Toolbox then loaded the ` keychron_v1_ansi_default.bin` firmware into it. Then I followed the [Keychron documentation](https://www.keychron.com/blogs/archived/how-to-factory-reset-or-flash-your-qmk-via-enabled-keychron-v1-keyboard) to flashing the keyboard which was basically as follows.

![qmk toolbox](https://melon-sour-blog-images.s3.amazonaws.com/20240108-qmk-toolbox.jpeg)

1. Hold `fn + J + Z` for 4 seconds to factory reset the keyboard then unplug the power.
2. Hold the reset button under the spacebar.
3. Plug in the keyboard and making sure `DFU device connected` is displayed in QMK Toolbox in yellow.
4. Press flash.
5. Hold `fn + J + Z` for 4 seconds again and factory reset for good measure.

And that's it, with the new firmware the v1 is noticeably more responsive. Though I don't have exact numbers to back this claim, it feels comparable to the Epomaker E84 I was using before so I'm guessing it's somewhere between 10ms and the original 20ms.
