import { InjectRepository } from "@nestjs/typeorm";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Message,
} from "discord.js";
import { CommandLine, CommandLineClass } from "src/bot/base/command.base";
import { User } from "src/bot/models/user.entity";
import { Workout } from "src/bot/models/workout.entity";
import { KomubotrestService } from "src/bot/utils/komubotrest/komubotrest.service";
import { UtilsService } from "src/bot/utils/utils.service";
import { Repository } from "typeorm";

const monthSupport = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

@CommandLine({
  name: "workout",
  description: "workout",
  cat: "komu",
})
export class WorkoutCommand implements CommandLineClass {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Workout)
    private workoutRepository: Repository<Workout>,
    private komubotrestService: KomubotrestService,
    private utilsService: UtilsService
  ) {}
  async execute(message: Message, args, client: Client) {
    try {
      const authorId = message.author.id;
      if (args[0] === "summary") {
        if (!args[1]) {
          args[1] = `${new Date().getMonth() + 1}`;
        }
        if (monthSupport.includes(args[1].toUpperCase())) {
          const date = new Date();
          let dateFormat;
          const year = date.getFullYear();
          if (args[1].length > 2) {
            dateFormat = new Date(`${args[1]} ${year}`);
          } else {
            dateFormat = new Date(year, +args[1] - 1);
          }
          const y = dateFormat.getFullYear();
          const m = dateFormat.getMonth();
          const firstDay = new Date(y, m, 1);
          const lastDay = new Date(y, m + 1, 0);

          const userCheckWorkout = await this.workoutRepository
            .createQueryBuilder("workout")
            .where(`"createdTimestamp" >= :gtecreatedTimestamp`, {
              gtecreatedTimestamp: firstDay.getTime(),
            })
            .andWhere(`"createdTimestamp" <= :ltecreatedTimestamp`, {
              ltecreatedTimestamp: lastDay.getTime(),
            })
            .andWhere('"status" = :status', { status: "approve" })
            .groupBy("workout.userId")
            .addGroupBy("workout.email")
            .select("workout.email, COUNT(workout.userId) as total")
            .orderBy("total", "DESC")
            .execute();

          let mess;
          if (!userCheckWorkout) {
            return;
          } else if (
            Array.isArray(userCheckWorkout) &&
            userCheckWorkout.length === 0
          ) {
            mess = "```" + "No results" + "```";
            return message.reply(mess).catch((err) => {
              this.komubotrestService.sendErrorToDevTest(client, m, err);
            });
          } else {
            for (
              let i = 0;
              i <= Math.ceil(userCheckWorkout.length / 50);
              i += 1
            ) {
              if (userCheckWorkout.slice(i * 50, (i + 1) * 50).length === 0) {
                break;
              }
              mess = userCheckWorkout
                .slice(i * 50, (i + 1) * 50)
                .map((item) => `${item.email} (${item.total})`)
                .join("\n");
              const Embed = new EmbedBuilder()
                .setTitle("Top workout")
                .setColor("Red")
                .setDescription(`${mess}`);
              await message.reply({ embeds: [Embed] }).catch((err) => {
                this.komubotrestService.sendErrorToDevTest(
                  client,
                  authorId,
                  err
                );
              });
            }
          }
        }
      } else if (args[0] === "help") {
        return (message as any).channel
          .reply("```" + "*workout month" + "\n" + "*workout" + "```")
          .catch(console.error);
      } else {
        const links = [];
        if (
          (message as any).channel.parentId !=
            process.env.KOMUBOTREST_WORKOUT_CHANNEL_ID &&
          message.channel.id != process.env.KOMUBOTREST_WORKOUT_CHANNEL_ID
        ) {
          return message.reply("Workout failed").catch(console.error);
        }

        if (message.attachments && message.attachments.first()) {
          message.attachments.forEach((attachment) => {
            try {
              const imageLink = attachment.proxyURL;
              links.push(imageLink);
            } catch (error) {
              console.error(error);
            }
          });
          if (links.length > 0) {
            const checkWorkout = await this.workoutRepository
              .createQueryBuilder()
              .where(`"createdTimestamp" >= :gtecreatedTimestamp`, {
                gtecreatedTimestamp: this.utilsService.getYesterdayDate(),
              })
              .andWhere(`"createdTimestamp" <= :ltecreatedTimestamp`, {
                ltecreatedTimestamp: this.utilsService.getTomorrowDate(),
              })
              .andWhere('"status" = :status', { status: "approve" })
              .andWhere('"userId" = :userId', { userId: message.author.id })
              .select("*")
              .execute();

            if (checkWorkout.length > 0) {
              return message
                .reply("You submitted your workout today")
                .catch(console.error);
            }

            const workout = await this.workoutRepository.save({
              userId: message.author.id,
              email:
                message.member != null || message.member != undefined
                  ? message.member.displayName
                  : message.author.username,
              createdTimestamp: Date.now(),
              attachment: true,
              status: "approve",
              channelId: process.env.KOMUBOTREST_WORKOUT_CHANNEL_ID,
            });

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(
                  "workout_reject#" +
                    workout.email +
                    "#" +
                    workout.id +
                    "#" +
                    workout.channelId +
                    "#" +
                    message.author.id
                )
                .setLabel("REJECT")
                .setStyle(ButtonStyle.Danger)
            );

            const workoutButton = await message
              .reply({
                content: "`✅` workout daily saved.",
                components: [row as any],
              })
              .catch();

            const collector = workoutButton.createMessageComponentCollector({
              time: 43200000,
              max: 10,
            });

            collector.on("collect", async (i) => {
              const checkRole = await this.userRepository
                .createQueryBuilder("user")
                .where('"userId" = :userId', { userId: i.user })
                .andWhere('"deactive" IS NOT True')
                .andWhere('("roles_discord" @> :hr)', {
                  hr: ["HR"],
                })
                .select("*")
                .execute();

              if (
                checkRole.length > 0 ||
                i.user.id === "921261168088190997" ||
                i.user.id === "868040521136873503"
              ) {
                const iCollect = i.customId.split("#");
                if (iCollect[0] === "workout_reject") {
                  const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                      .setCustomId("workout_reject_deactive#")
                      .setLabel("REJECTED ❌")
                      .setStyle(ButtonStyle.Danger)
                      .setDisabled(true)
                  );

                  await i.update({
                    content: "`✅` workout daily saved.",
                    components: [row as any],
                  });
                }
                return;
              }
            });
          }
        } else {
          message.reply("Please send the file attachment").catch(console.error);
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
}