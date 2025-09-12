import React from 'react';
import { GetStaticProps } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { remark } from 'remark';
import html from 'remark-html';
import LegalLayout from '../components/LegalLayout';

interface PrivacyPageProps {
  contentHtml: string;
}

const PrivacyPage: React.FC<PrivacyPageProps> = ({ contentHtml }) => {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="Privacy Policy for MemeMe - learn how we collect, use, and protect your personal data when using our meme generation service."
    >
      <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </LegalLayout>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  const filePath = path.join(process.cwd(), 'src', 'content', 'legal', 'privacy.md');
  const fileContents = await fs.readFile(filePath, 'utf8');

  // Process markdown
  const processedContent = await remark().use(html).process(fileContents);
  const contentHtml = processedContent.toString();

  return {
    props: {
      contentHtml,
    },
  };
};

export default PrivacyPage;