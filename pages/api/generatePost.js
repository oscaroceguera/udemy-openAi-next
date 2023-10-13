import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { Configuration, OpenAIApi } from "openai";
import clientPromise from "../../lib/mongodb";

export default withApiAuthRequired(async function handler(req, res) {
  const { user } = await getSession(req, res);

  const client = await clientPromise;
  const db = client.db("BlogStandard");
  const userProfile = await db.collection("users").findOne({
    auth0Id: user.sub,
  });

  if (!userProfile?.availableTokens) {
    res.status(403);
    return;
  }

  console.log("process.env.OPENAI_API_KEY", process.env.OPENAI_API_KEY);
  const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const openai = new OpenAIApi(config);

  const { topic, keywords } = req.body;

  // const response = await openai.createCompletion({
  //   model: "text-davinci-003",
  //   temperature: 0,
  //   max_tokens: 3600,
  //   prompt: `Write a long and detailed SEO-friendly blog post about ${topic}, that targets the following comma-separated keywords: ${keywords}.
  //   The response should be formatted in SEO-friendly HTML,
  //   limited to the following HTML tags: p, h1, h2, h3, h4, h5, h6, strong, i, ul, li, ol.`,
  // });

  const postContentResponse = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "You are a blog post generator.",
      },
      {
        role: "user",
        content: `Write a long and detailed SEO-friendly blog post about ${topic}, that targets the following comma-separated keywords: ${keywords}. 
      The response should be formatted in SEO-friendly HTML, 
      limited to the following HTML tags: p, h1, h2, h3, h4, h5, h6, strong, i, ul, li, ol.`,
      },
    ],
  });

  const postContent =
    postContentResponse.data.choices[0]?.message?.content || "";

  const titleResponse = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "You are a blog post generator.",
      },
      {
        role: "user",
        content: `Write a long and detailed SEO-friendly blog post about ${topic}, that targets the following comma-separated keywords: ${keywords}. 
      The response should be formatted in SEO-friendly HTML, 
      limited to the following HTML tags: p, h1, h2, h3, h4, h5, h6, strong, i, ul, li, ol.`,
      },
      {
        role: "assistant",
        content: postContent,
      },
      {
        role: "user",
        content: "Generate appropiate title tag text for the above blog post",
      },
    ],
  });

  const metaDescriptionResponse = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "You are a blog post generator.",
      },
      {
        role: "user",
        content: `Write a long and detailed SEO-friendly blog post about ${topic}, that targets the following comma-separated keywords: ${keywords}. 
      The response should be formatted in SEO-friendly HTML, 
      limited to the following HTML tags: p, h1, h2, h3, h4, h5, h6, strong, i, ul, li, ol.`,
      },
      {
        role: "assistant",
        content: postContent,
      },
      {
        role: "user",
        content:
          "Generate SEO-friendly meta description content for the above blog spot",
      },
    ],
  });

  const title = titleResponse.data.choices[0]?.message?.content || "";
  const metaDescription =
    metaDescriptionResponse.data.choices[0]?.message?.content || "";

  await db.collection("users").updateOne(
    {
      auth0Id: user.sub,
    },
    {
      $inc: {
        availableTokens: -1,
      },
    }
  );

  const parsed = JSON.parse({
    postContent,
    title,
    metaDescription,
  });

  const post = await db.collection("posts").inserOne({
    postContent: parsed?.postContent,
    title: parsed?.title,
    metaDescription: parsed?.metaDescription,
    topic,
    keywords,
    userId: userProfile._id,
    create: new Date(),
  });

  res.status(200).json({
    post: JSON.parse({
      postContent,
      title,
      metaDescription,
    }),
  });
});
