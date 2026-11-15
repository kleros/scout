import DiscordLogo from "svgs/socialmedia/discord.svg";
import GithubLogo from "svgs/socialmedia/github.svg";
import LinkedinLogo from "svgs/socialmedia/linkedin.svg";
import YouTubeLogo from "svgs/socialmedia/youtube.svg";
import TelegramLogo from "svgs/socialmedia/telegram.svg";
import XLogo from "svgs/socialmedia/x.svg";

/** `name` is the link's accessible name: the icons carry no text. */
export const socialmedia = {
  telegram: {
    name: "Telegram",
    icon: TelegramLogo,
    url: "https://t.me/KlerosCurate",
  },
  x: {
    name: "X",
    icon: XLogo,
    url: "https://x.com/KlerosCurate",
  },
  discord: {
    name: "Discord",
    icon: DiscordLogo,
    url: "https://discord.com/invite/MhXQGCyHd9",
  },
  youtube: {
    name: "YouTube",
    icon: YouTubeLogo,
    url: "https://youtube.com/@kleros_io",
  },
  github: {
    name: "GitHub",
    icon: GithubLogo,
    url: "https://github.com/kleros/scout",
  },
  linkedin: {
    name: "LinkedIn",
    icon: LinkedinLogo,
    url: "https://www.linkedin.com/company/kleros/",
  },
};
